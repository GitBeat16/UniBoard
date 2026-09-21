/**
 * Browser-only. Phone photos of a timetable are 3–12 MP and 2–6 MB, which is
 * both over the upload ceiling and far more than the vision model needs to
 * read a grid. Scale the long edge down and re-encode as JPEG.
 *
 * Returns the original file untouched when it is not an image, is already
 * small, or the browser cannot decode it (the server still validates size).
 */
export const MAX_FILE = 4 * 1024 * 1024;
const LONG_EDGE = 2400; // enough to read 8pt text off a full-page grid
const QUALITY = 0.86;
const SKIP_BELOW = 1.2 * 1024 * 1024;

export function targetSize(width: number, height: number, longEdge = LONG_EDGE) {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size <= SKIP_BELOW) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = targetSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // JPEG has no alpha; a transparent screenshot would otherwise go black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}
