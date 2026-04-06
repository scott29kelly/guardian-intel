"use client";

/**
 * Global Error Boundary
 *
 * Catches errors in the root layout. Must render its own <html>/<body>
 * since the root layout may have failed. Uses inline styles only —
 * global CSS is not guaranteed to be available.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          color: "#e2e8f0",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center", padding: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 24px",
              borderRadius: 16,
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            !
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </h1>

          <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 24 }}>
            A critical error occurred. This has been logged automatically.
          </p>

          {process.env.NODE_ENV === "development" && (
            <pre
              style={{
                fontSize: 12,
                color: "#f87171",
                backgroundColor: "rgba(239,68,68,0.05)",
                padding: 12,
                borderRadius: 8,
                marginBottom: 24,
                textAlign: "left",
                overflow: "auto",
                maxHeight: 120,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {error.message}
            </pre>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#D4A656",
                color: "#1E3A5F",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid #334155",
                backgroundColor: "transparent",
                color: "#e2e8f0",
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
