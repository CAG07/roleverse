// lib/images/cover-image-constants.ts
// Shared between the client upload form and the server-side PDF-cover route
// so the two paths can't drift the way CampaignsListPage/StudioCampaignPicker's
// duplicated cover-aspect math once did — one number, referenced from both
// sides, instead of two copies that silently disagree.

/** Source-file cap for a direct image upload (JPG/PNG), enforced client-side. */
export const COVER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Source-file cap for a single-page PDF cover upload. Larger than the image
 * cap since a "print to PDF" single page typically encodes larger than a
 * pre-cropped raster image; enforced client-side (fast local check) and
 * authoritatively server-side in the cover-from-pdf route. */
export const PDF_COVER_MAX_BYTES = 8 * 1024 * 1024;

/** Long-edge target both upload paths resize/render down to. */
export const COVER_IMAGE_MAX_DIMENSION_PX = 1024;
