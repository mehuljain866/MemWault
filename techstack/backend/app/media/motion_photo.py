import logging, re
logger = logging.getLogger("memwault.motion_photo")

def extract_embedded_motion_video(file_bytes: bytes):
    if not file_bytes or len(file_bytes) < 1024:
        return None, None
    try:
        header_sample = file_bytes[:100000]
        offset_match = re.search(rb'MicroVideoOffset[=:\s]+(\d*)', header_sample, re.IGNORECASE)
        if offset_match:
            offset = int(offset_match.group(1).decode("ascii"))
            if 0 < offset < len(file_bytes):
                video_data = file_bytes[len(file_bytes) - offset:]
                if b'ftyp' in video_data[:32]:
                    logger.info("Extracted Google Motion Photo micro-video, %d bytes", len(video_data))
                    return video_data, "video/mp4"
    except Exception as e:
        pass

    try:
        scan_window = file_bytes[-20 * 1024 * 1024:] if len(file_bytes) > 20 * 1024 * 1024 else file_bytes
        ftyp_indices = [m.start() for m in re.finditer(rb'ftyp(isom|mp42|qt\s|MSNV|hesb)', scan_window)]
        if ftyp_indices:
            ftyp_pos = ftyp_indices[-1]
            box_start = ftyp_pos - 4
            if box_start >= 0:
                abs_start = len(file_bytes) - len(scan_window) + box_start
                video_data = file_bytes[abs_start:]
                if len(video_data) > 4096:
                    logger.info("Found binary MP4 container in motion photo, %d bytes", len(video_data))
                    return video_data, "video/mp4"
    except Exception as e:
        pass

    return None, None
