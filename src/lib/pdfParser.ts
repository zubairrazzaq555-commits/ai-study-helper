"use client";

// Client-side PDF text extraction using pdfjs-dist
// No server needed — runs entirely in the browser

export interface PdfParseResult {
  text: string;
  pageCount: number;
  pagesExtracted: number;
  truncated: boolean;
  fileName: string;
}

const MAX_PAGES = 50; // extract max 50 pages per PDF

export async function parsePdfFile(file: File): Promise<PdfParseResult> {
  // Dynamically import pdfjs to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist");

  // Set worker source — use CDN to avoid bundling issues
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);

  const loadingTask = pdfjsLib.getDocument({
    data: typedArray,
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const pagesToExtract = Math.min(pageCount, MAX_PAGES);
  const truncated = pageCount > MAX_PAGES;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pagesToExtract; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Join text items, preserving line breaks
      let pageText = "";
      let lastY: number | null = null;

      for (const item of textContent.items) {
        if ("str" in item) {
          const currentY = "transform" in item ? item.transform[5] : null;
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
            pageText += "\n";
          }
          pageText += item.str;
          if ("transform" in item) lastY = item.transform[5];
        }
      }

      if (pageText.trim()) {
        pageTexts.push(`--- Page ${pageNum} ---\n${pageText.trim()}`);
      }
    } catch (err) {
      console.warn(`Failed to extract page ${pageNum}:`, err);
    }
  }

  const text = pageTexts.join("\n\n");

  return {
    text: text.trim(),
    pageCount,
    pagesExtracted: pagesToExtract,
    truncated,
    fileName: file.name,
  };
}

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function isTextFile(file: File): boolean {
  return (
    file.type === "text/plain" ||
    file.type === "text/markdown" ||
    file.name.toLowerCase().endsWith(".txt") ||
    file.name.toLowerCase().endsWith(".md")
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
