# Mercasto media upload safety

Status: source-level audit from committed Laravel code.

## Primary source

`backend/app/Http/Controllers/Api/AdController.php`

## Entry points

| Flow | Route source | Controller method | Purpose |
| --- | --- | --- | --- |
| Create listing | `POST /api/ads` | `AdController::store` | Creates a listing with optional images and video. |
| Update listing | `POST /api/ads/{ad}` | `AdController::update` | Updates listing fields and can add/remove images or video. |

Both routes are inside the `auth:sanctum` group in `backend/routes/api.php`.

## Image validation invariants

Current source-level invariants:

- `images` is optional.
- `images` must be an array.
- Maximum image count is 10.
- Every image must be a file.
- Allowed image extensions are jpg, jpeg, png, webp, and gif.
- Per-image maximum is 5120 KB.
- Maximum dimensions are 4096 by 4096.
- Images are decoded and scaled down to 1200 by 1200 before storage.
- Stored listing images are generated as UUID-based WebP files.
- Images are written to the public storage disk under the listing media path.

## Video validation invariants

Current source-level invariants:

- `video_file` is optional.
- `video_file` must be a file.
- Allowed video MIME types are MP4 and QuickTime.
- Per-video maximum is 51200 KB.
- Video watermark processing is queued after upload.

## Update-specific ownership and count controls

`AdController::update` additionally enforces:

- Only the listing owner or an admin may edit the listing.
- Existing image paths must remain under the expected listing media prefix.
- Only images already attached to the listing may be retained.
- Removed images are deleted from the public disk.
- Total image count across retained plus new images cannot exceed 10.
- New content changes can push active/rejected listings back to pending moderation.

## Runtime alignment

Current runtime expectations from existing smoke checks:

- PHP `upload_max_filesize` is expected to be `10M`.
- PHP `post_max_size` is expected to be `25M`.
- Nginx request body cap is expected to be `25m`.

The current image validation limit of 5120 KB is below the PHP single-file limit. The video validation limit of 51200 KB is above the current PHP and nginx body caps, so large videos may be rejected before Laravel validation. This should be treated as a follow-up UX/runtime alignment issue rather than an immediate security failure.

## Regression gate

Run:

```bash
bash scripts/media-upload-validation-scan.sh
bash scripts/static-safety-scans.sh
```

The scan checks that the key image/video validation and WebP storage invariants remain visible in source.

## Follow-up gaps

1. Decide whether video upload should stay at 50 MB or be aligned down to the current 25 MB request cap.
2. Add a user-facing Spanish error path for oversized video/image uploads when nginx or PHP rejects before Laravel.
3. Add authenticated upload smoke only after stable test credentials exist.
4. Confirm public `/storage/` serves uploaded media inertly and traversal probes remain denied.
5. Consider using MIME sniffing plus image decode validation as defense in depth for uploaded images.
