"use client";

/**
 * usePdfSlides — Renders a base64 PDF into individual page images using pdfjs-dist.
 *
 * Used by DeckPreview when the server-side pdfToImages() fails and the deck
 * arrives with raw pdfData instead of per-slide PNGs.
 *
 * pdfjs-dist is imported dynamically to avoid SSR crashes (it references
 * DOMMatrix at module evaluation time which doesn't exist on the server).
 */

import { useState, useEffect, useRef } from "react";

interface UsePdfSlidesResult {
  pages: string[];   // data:image/png;base64,... URLs for each page
  loading: boolean;
  error: string | null;
}

// 60s timeout — large PDFs can take a while to render all pages
const RENDER_TIMEOUT_MS = 60_000;

export function usePdfSlides(pdfBase64: string | undefined): UsePdfSlidesResult {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!pdfBase64);
  const [error, setError] = useState<string | null>(null);
  const prevPdfRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!pdfBase64) {
      setLoading(false);
      return;
    }
    if (pdfBase64 === prevPdfRef.current) return;
    prevPdfRef.current = pdfBase64;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function renderPages() {
      setLoading(true);
      setError(null);
      setPages([]);

      // Safety timeout so the hook never hangs forever
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          cancelled = true;
          setError("PDF rendering timed out");
          setLoading(false);
        }
      }, RENDER_TIMEOUT_MS);

      try {
        // Dynamic import — pdfjs-dist can only run in the browser
        const pdfjsLib = await import("pdfjs-dist");
        // cdnjs doesn't have all pdfjs versions — jsDelivr mirrors npm directly
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        if (cancelled) return;

        // Decode base64 → binary
        const raw = atob(pdfBase64!);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          bytes[i] = raw.charCodeAt(i);
        }

        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (cancelled) return;

        const rendered: string[] = [];

        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          if (cancelled) return;

          const page = await doc.getPage(pageNum);
          const scale = 2; // 2x for crisp rendering
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (page.render as any)({ canvasContext: ctx, viewport }).promise;
          rendered.push(canvas.toDataURL("image/png"));
        }

        if (!cancelled) {
          setPages(rendered);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[usePdfSlides] Failed to render PDF:", msg);
          setError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
        clearTimeout(timeoutId);
      }
    }

    renderPages();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [pdfBase64]);

  return { pages, loading, error };
}
