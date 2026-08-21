"use client";

const MAX_PAGES = 5;

export async function pdfToImageFiles(file: File): Promise<File[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_PAGES);
  const baseName = file.name.replace(/\.pdf$/i, "");

  const pages: File[] = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas недоступен в этом браузере");

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Не удалось отрендерить страницу PDF"))), "image/png");
    });

    pages.push(new File([blob], `${baseName}-p${i}.png`, { type: "image/png" }));
  }

  return pages;
}
