"""
MemWault S3/MinIO Object Storage Client
Handles uploading, downloading, and managing story media files
in S3-compatible object storage.
"""

import logging
from io import BytesIO
from pathlib import Path
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.config import get_settings

logger = logging.getLogger("memwault.storage")


class StorageClient:
    """
    S3-compatible object storage client.
    Works with both AWS S3 and self-hosted MinIO.
    """

    def __init__(self):
        settings = get_settings()
        self.storage_type = settings.storage_type
        self.bucket_name = settings.s3_bucket_name

        if self.storage_type == "local":
            self.local_dir = Path(settings.storage_local_dir)
            self.local_dir.mkdir(parents=True, exist_ok=True)
            logger.info("Using local directory storage at: %s", self.local_dir.resolve())
            self.client = None
        else:
            self.client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint_url,
                aws_access_key_id=settings.s3_access_key,
                aws_secret_access_key=settings.s3_secret_key,
                region_name=settings.s3_region,
                config=BotoConfig(
                    signature_version="s3v4",
                    s3={"addressing_style": "path"},
                ),
            )
            # Ensure bucket exists
            self._ensure_bucket()

    def _ensure_bucket(self):
        """Create the storage bucket if it doesn't exist."""
        if self.storage_type == "local":
            return
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            try:
                self.client.create_bucket(Bucket=self.bucket_name)
                logger.info("Created bucket: %s", self.bucket_name)
            except ClientError as e:
                logger.error("Failed to create bucket: %s", e)

    # ── Upload ───────────────────────────────────────────

    def upload_file(
        self,
        file_path: Path,
        s3_key: str,
        content_type: Optional[str] = None,
    ) -> str:
        """
        Upload a local file to storage.
        Returns the storage key of the uploaded file.
        """
        if self.storage_type == "local":
            dest = self.local_dir / s3_key
            dest.parent.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copy2(file_path, dest)
            logger.info("Uploaded local file %s -> %s", file_path.name, dest)
            return s3_key

        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type
        else:
            # Auto-detect content type
            suffix = file_path.suffix.lower()
            ct_map = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".mp4": "video/mp4",
                ".mov": "video/quicktime",
                ".mem": "application/zip",
                ".json": "application/json",
            }
            extra_args["ContentType"] = ct_map.get(suffix, "application/octet-stream")

        self.client.upload_file(
            str(file_path),
            self.bucket_name,
            s3_key,
            ExtraArgs=extra_args,
        )
        logger.info("Uploaded %s -> s3://%s/%s", file_path.name, self.bucket_name, s3_key)
        return s3_key

    def upload_bytes(
        self,
        data: bytes,
        s3_key: str,
        content_type: str = "application/octet-stream",
    ) -> str:
        """Upload raw bytes to storage."""
        if self.storage_type == "local":
            dest = self.local_dir / s3_key
            dest.parent.mkdir(parents=True, exist_ok=True)
            with open(dest, "wb") as f:
                f.write(data)
            logger.info("Uploaded bytes locally to %s (%d bytes)", dest, len(data))
            return s3_key

        self.client.put_object(
            Bucket=self.bucket_name,
            Key=s3_key,
            Body=data,
            ContentType=content_type,
        )
        logger.info("Uploaded bytes -> s3://%s/%s (%d bytes)", self.bucket_name, s3_key, len(data))
        return s3_key

    # ── Download ─────────────────────────────────────────

    def download_file(self, s3_key: str, local_path: Path) -> Path:
        """Download a file from storage to a local path."""
        local_path.parent.mkdir(parents=True, exist_ok=True)
        if self.storage_type == "local":
            src = self.local_dir / s3_key
            import shutil
            shutil.copy2(src, local_path)
            logger.info("Downloaded local storage %s -> %s", src, local_path)
            return local_path

        self.client.download_file(self.bucket_name, s3_key, str(local_path))
        logger.info("Downloaded s3://%s/%s -> %s", self.bucket_name, s3_key, local_path)
        return local_path

    def download_bytes(self, s3_key: str) -> bytes:
        """Download a file from storage as raw bytes."""
        if self.storage_type == "local":
            src = self.local_dir / s3_key
            with open(src, "rb") as f:
                return f.read()

        response = self.client.get_object(Bucket=self.bucket_name, Key=s3_key)
        return response["Body"].read()

    # ── Pre-signed URLs / Local Paths ────────────────────

    def get_presigned_url(
        self,
        s3_key: str,
        expires_in: int = 3600,
    ) -> str:
        """
        Generate a pre-signed URL (or local serving route) for access.
        """
        if self.storage_type == "local":
            # Returns a path mapped to the FastAPI local media server
            return f"/api/v1/media/{s3_key}"

        url = self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": s3_key},
            ExpiresIn=expires_in,
        )
        return url

    # ── List & Delete ────────────────────────────────────

    def list_objects(self, prefix: str = "") -> list[dict]:
        """List objects in the storage with an optional prefix filter."""
        if self.storage_type == "local":
            results = []
            if not self.local_dir.exists():
                return results
            from datetime import datetime
            for path in self.local_dir.rglob("*"):
                if path.is_file():
                    # Get key by relative path to local_dir
                    key = path.relative_to(self.local_dir).as_posix()
                    if key.startswith(prefix):
                        stat_val = path.stat()
                        results.append({
                            "key": key,
                            "size": stat_val.st_size,
                            "last_modified": datetime.fromtimestamp(stat_val.st_mtime).isoformat(),
                        })
            return results

        response = self.client.list_objects_v2(
            Bucket=self.bucket_name,
            Prefix=prefix,
        )
        return [
            {
                "key": obj["Key"],
                "size": obj["Size"],
                "last_modified": obj["LastModified"].isoformat(),
            }
            for obj in response.get("Contents", [])
        ]

    def delete_object(self, s3_key: str):
        """Delete a single object from storage."""
        if self.storage_type == "local":
            dest = self.local_dir / s3_key
            if dest.exists():
                dest.unlink()
            logger.info("Deleted local file %s", dest)
            return

        self.client.delete_object(Bucket=self.bucket_name, Key=s3_key)
        logger.info("Deleted s3://%s/%s", self.bucket_name, s3_key)

    def get_total_size_mb(self, prefix: str = "") -> float:
        """Calculate total storage used in megabytes."""
        objects = self.list_objects(prefix)
        total_bytes = sum(obj["size"] for obj in objects)
        return round(total_bytes / (1024 * 1024), 2)


# ── Singleton ────────────────────────────────────────────

_storage_client: Optional[StorageClient] = None


def get_storage() -> StorageClient:
    """Get or create the singleton storage client."""
    global _storage_client
    if _storage_client is None:
        _storage_client = StorageClient()
    return _storage_client
