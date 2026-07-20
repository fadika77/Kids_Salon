"""
Image storage for the gallery.

Two modes, chosen automatically:

  1. CLOUD (production): if the CLOUDINARY_URL environment variable is set,
     images are uploaded to Cloudinary. They survive every deploy/restart,
     are served from a fast global CDN, and work on Render's FREE plan.

  2. LOCAL (development fallback): without CLOUDINARY_URL, images are saved
     to uploads/gallery/ on disk exactly as before. Fine for local testing;
     NOT durable on Render (the disk is wiped on every deploy).

CLOUDINARY_URL looks like:  cloudinary://<api_key>:<api_secret>@<cloud_name>
You get it from the Cloudinary dashboard after creating a free account.
"""
import os
import uuid

GALLERY_DIR = os.path.join("uploads", "gallery")

CLOUD_ENABLED = bool(os.getenv("CLOUDINARY_URL"))

if CLOUD_ENABLED:
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(secure=True)   # read CLOUDINARY_URL, force https URLs


def upload_image(contents: bytes, original_filename: str = "") -> dict:
    """
    Store an image. Returns:
      {"url": <public url or /uploads/... path>, "public_id": <cloud id or None>, "filename": <local name or "">}
    """
    if CLOUD_ENABLED:
        result = cloudinary.uploader.upload(
            contents,
            folder="kids-salon/gallery",
            resource_type="image",
        )
        return {"url": result["secure_url"], "public_id": result["public_id"], "filename": ""}

    # Local fallback
    ext = os.path.splitext(original_filename or "")[1].lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        ext = ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    os.makedirs(GALLERY_DIR, exist_ok=True)
    with open(os.path.join(GALLERY_DIR, filename), "wb") as f:
        f.write(contents)
    return {"url": f"/uploads/gallery/{filename}", "public_id": None, "filename": filename}


def delete_image(public_id: str | None, filename: str | None) -> None:
    """Delete an image from wherever it is stored. Never raises."""
    if public_id and CLOUD_ENABLED:
        try:
            cloudinary.uploader.destroy(public_id, resource_type="image")
        except Exception:
            pass
    if filename:
        try:
            os.remove(os.path.join(GALLERY_DIR, filename))
        except OSError:
            pass
