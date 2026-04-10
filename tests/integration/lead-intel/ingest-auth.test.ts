/**
 * POST /api/lead-intel/ingest auth gate smoke test.
 *
 * Uses the Next.js route handler function directly (not via an HTTP server)
 * to avoid the need to boot Next on the test runner. Mocks NextRequest
 * minimally.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { POST as ingestPOST } from "@/app/api/lead-intel/ingest/route";
import { env } from "@/lib/env";

function mkRequest(headers: Record<string, string>, body: unknown) {
  const url = "http://localhost:3000/api/lead-intel/ingest";
  return new Request(url, {
    method: "POST",
    headers: new Headers(headers),
    body: JSON.stringify(body),
  }) as any;
}

describe("lead-intel / ingest auth (LG-06)", () => {
  beforeAll(() => {
    if (!env.LEAD_INTEL_INGEST_SECRET) {
      console.warn(
        "[test] LEAD_INTEL_INGEST_SECRET not set in env — positive auth test will be skipped",
      );
    }
  });

  it("returns 401 when X-Lead-Intel-Ingest-Key header is missing", async () => {
    if (!env.LEAD_INTEL_INGEST_SECRET) return; // 503 when secret not configured — skip
    const req = mkRequest({ "content-type": "application/json" }, { source: "test", rows: [] });
    const res = await ingestPOST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when X-Lead-Intel-Ingest-Key header is wrong", async () => {
    if (!env.LEAD_INTEL_INGEST_SECRET) return; // 503 when secret not configured — skip
    const req = mkRequest(
      { "content-type": "application/json", "x-lead-intel-ingest-key": "definitely-not-right" },
      { source: "test", rows: [] },
    );
    const res = await ingestPOST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body shape when auth is correct", async () => {
    if (!env.LEAD_INTEL_INGEST_SECRET) return;
    const req = mkRequest(
      {
        "content-type": "application/json",
        "x-lead-intel-ingest-key": env.LEAD_INTEL_INGEST_SECRET,
      },
      { nope: true },
    );
    const res = await ingestPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 and runId on an empty-rows ingest batch when auth is correct", async () => {
    if (!env.LEAD_INTEL_INGEST_SECRET) return;
    const req = mkRequest(
      {
        "content-type": "application/json",
        "x-lead-intel-ingest-key": env.LEAD_INTEL_INGEST_SECRET,
      },
      { source: "test:empty", rows: [] },
    );
    const res = await ingestPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.runId).toBe("string");
  });
});
