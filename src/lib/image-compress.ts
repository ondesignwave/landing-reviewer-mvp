"use client";

const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

// Vercel serverless functions hard-cap request bodies at 4.5MB. Real phone
// photos routinely exceed that, so re-encode anything large (or just any
// image, since this is cheap and also speeds up the AI analysis step,
// which is the pipeline's biggest cost) before it ever hits /api/upload.
export async function compressImageFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен в этом браузере");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Не удалось обработать изображение"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });

  const name = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
