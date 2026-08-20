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
    return None, None


def extract_image_metadata(file_bytes: bytes) -> dict:
    """Extract image dimensions and EXIF camera / capture details from raw bytes."""
    meta = {}
    if not file_bytes:
        return meta
    try:
        import io
        from PIL import Image, ExifTags
        img = Image.open(io.BytesIO(file_bytes))
        meta["width"] = img.width
        meta["height"] = img.height
        exif = img.getexif()
        if exif:
            exif_dict = {}
            for k, v in exif.items():
                tag_name = ExifTags.TAGS.get(k, str(k))
                exif_dict[tag_name] = str(v)
            if "Make" in exif_dict:
                meta["camera_make"] = exif_dict["Make"]
            if "Model" in exif_dict:
                meta["camera_model"] = exif_dict["Model"]
            if "DateTimeOriginal" in exif_dict:
                meta["taken_at"] = exif_dict["DateTimeOriginal"]
            elif "DateTime" in exif_dict:
                meta["taken_at"] = exif_dict["DateTime"]
            if "LensModel" in exif_dict:
                meta["lens_model"] = exif_dict["LensModel"]
    except Exception as e:
        logger.debug("Could not parse EXIF: %s", e)
    return meta

