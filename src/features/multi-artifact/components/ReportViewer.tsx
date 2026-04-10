"use client";

/**
 * ReportViewer Component
 *
 * Branded markdown report viewer for written report artifacts. Renders
 * markdown content using react-markdown with custom component overrides that
 * apply the Guardian Intel brand palette (Navy headings, Teal links, Gold bold)
 * using Geist typography.
 *
 * Offers two actions:
 * - **Share** via the existing ShareSheet component
 * - **Download PDF** via jsPDF + html2canvas with explicit white background
 *   and hardcoded brand colors to avoid CSS variable issues in canvas capture
 *
 * NOTE: Does NOT use Tailwind `prose` classes -- `@tailwindcss/typography` is
 * not installed. All typography is achieved through explicit utility classes.
 */

import { useState, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Download, Share2 } from "lucide-react";
import { ShareSheet } from "@/features/infographic-generator/components/ShareSheet";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ReportViewerProps {
  markdown: string;
  customerName?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Brand-themed markdown component overrides (no prose plugin)
// ---------------------------------------------------------------------------

const BRAND_COMPONENTS = {
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-bold mt-6 mb-3" style={{ color: "#1E3A5F" }}>
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl font-semibold mt-5 mb-2" style={{ color: "#1E3A5F" }}>
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-medium mt-4 mb-1.5" style={{ color: "#1E3A5F" }}>
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="my-3 text-text-primary leading-relaxed">{children}</p>
  ),
  a: ({ href, children }: any) => (
    <a
      href={href}
      className="underline"
      style={{ color: "#4A90A4" }}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  ul: ({ children }: any) => (
    <ul className="my-2 ml-6 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-2 ml-6 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }: any) => (
    <li className="text-text-primary leading-relaxed">{children}</li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold" style={{ color: "#D4A656" }}>
      {children}
    </strong>
  ),
  blockquote: ({ children }: any) => (
    <blockquote
      className="border-l-4 pl-4 my-4 italic text-text-secondary"
      style={{ borderColor: "#4A90A4" }}
    >
      {children}
    </blockquote>
  ),
  code: ({ children }: any) => (
    <code className="px-1.5 py-0.5 bg-surface-secondary rounded text-sm font-mono">
      {children}
    </code>
  ),
};

// ---------------------------------------------------------------------------
// PDF export helper
// ---------------------------------------------------------------------------

/**
 * Capture the rendered report DOM and export as a multi-page A4 PDF.
 *
 * Uses explicit white background and hardcoded brand colors so html2canvas
 * does not mis-resolve CSS custom properties during capture.
 */
async function exportReportAsPdf(
  containerEl: HTMLDivElement,
  customerName: string,
): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  // Capture at 2x for crisp text
  const canvas = await html2canvas(containerEl, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 dimensions in mm
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  // Scale image to fit page width
  const ratio = contentWidth / (imgWidth / 2); // divide by scale factor
  const scaledHeight = (imgHeight / 2) * ratio;

  const pdf = new jsPDF("p", "mm", "a4");

  if (scaledHeight <= contentHeight) {
    // Single page
    pdf.addImage(imgData, "PNG", margin, margin, contentWidth, scaledHeight);
  } else {
    // Multi-page: slice the canvas into page-height chunks
    const totalPages = Math.ceil(scaledHeight / contentHeight);
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Calculate the source y offset for this page
      const srcY = (page * contentHeight) / ratio * 2; // back to canvas pixels
      const srcHeight = Math.min(
        (contentHeight / ratio) * 2,
        imgHeight - srcY,
      );

      // Create a sub-canvas for this page slice
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = imgWidth;
      pageCanvas.height = srcHeight;
      const ctx = pageCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(
          canvas,
          0,
          srcY,
          imgWidth,
          srcHeight,
          0,
          0,
          imgWidth,
          srcHeight,
        );
      }

      const pageImg = pageCanvas.toDataURL("image/png");
      const sliceHeight = (srcHeight / 2) * ratio;
      pdf.addImage(pageImg, "PNG", margin, margin, contentWidth, sliceHeight);
    }
  }

  // Save the PDF via file-saver
  const blob = pdf.output("blob");
  const { saveAs } = await import("file-saver");
  saveAs(blob, `${customerName.replace(/\s+/g, "-")}-Report.pdf`);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportViewer({
  markdown,
  customerName,
  className,
}: ReportViewerProps) {
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // PDF export handler
  // --------------------------------------------------------------------------

  const handleExportPdf = useCallback(async () => {
    if (!contentRef.current) return;

    setIsExporting(true);
    try {
      await exportReportAsPdf(
        contentRef.current,
        customerName || "Customer",
      );
    } catch (error) {
      console.error("[ReportViewer] PDF export error:", error);
    } finally {
      setIsExporting(false);
    }
  }, [customerName]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Action bar: Share + Download PDF */}
      <div className="flex items-center justify-end gap-2 pb-3 border-b border-border">
        <button
          onClick={() => setShowShareSheet(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
        <button
          onClick={handleExportPdf}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {isExporting ? "Exporting..." : "Download PDF"}
        </button>
      </div>

      {/* Markdown content with smooth scrolling */}
      <div
        ref={contentRef}
        className="report-viewer-content flex-1 overflow-y-auto py-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <ReactMarkdown components={BRAND_COMPONENTS}>{markdown}</ReactMarkdown>
      </div>

      {/* ShareSheet overlay -- no direct URL for reports (D-15) */}
      <ShareSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        imageData=""
        customerName={customerName}
      />
    </div>
  );
}
