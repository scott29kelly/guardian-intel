/**
 * LG-07 enforcement (Plan 08-05).
 *
 * Grep-based static assertion: the src/lib/services/lead-intel/ tree must
 * NEVER import from src/lib/services/scoring/ or src/lib/services/property/,
 * and vice versa. This test walks the file tree and reads every .ts file
 * under the three directories, asserting no violating import lines.
 *
 * Runs as a vitest unit test so it executes in the normal test battery
 * and fails loudly if someone adds a cross-import.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(__dirname, "..", "..", "..");
const LEAD_INTEL = join(ROOT, "src", "lib", "services", "lead-intel");
const SCORING = join(ROOT, "src", "lib", "services", "scoring");
const PROPERTY = join(ROOT, "src", "lib", "services", "property");

function walk(dir: string): string[] {
  const out: string[] = [];
  try {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const s = statSync(full);
      if (s.isDirectory()) out.push(...walk(full));
      else if (s.isFile() && (full.endsWith(".ts") || full.endsWith(".tsx"))) out.push(full);
    }
  } catch {
    // directory may not exist in a partial checkout
  }
  return out;
}

function filesImporting(files: string[], targetSubstrings: string[]): string[] {
  const matches: string[] = [];
  for (const f of files) {
    const content = readFileSync(f, "utf-8");
    for (const target of targetSubstrings) {
      if (content.includes(target)) {
        matches.push(`${f} :: ${target}`);
      }
    }
  }
  return matches;
}

describe("LG-07 enforcement: no cross-imports between lead-intel and scoring/property", () => {
  it("no file in src/lib/services/lead-intel/ imports from @/lib/services/scoring", () => {
    const files = walk(LEAD_INTEL);
    const violations = filesImporting(files, [
      'from "@/lib/services/scoring"',
      "from '@/lib/services/scoring'",
      'from "@/lib/services/scoring/',
      "from '@/lib/services/scoring/",
    ]);
    expect(violations, `LG-07 violation — remove these imports:\n${violations.join("\n")}`).toEqual([]);
  });

  it("no file in src/lib/services/lead-intel/ imports from @/lib/services/property", () => {
    const files = walk(LEAD_INTEL);
    const violations = filesImporting(files, [
      'from "@/lib/services/property"',
      "from '@/lib/services/property'",
      'from "@/lib/services/property/',
      "from '@/lib/services/property/",
    ]);
    expect(violations, `LG-07 violation — remove these imports:\n${violations.join("\n")}`).toEqual([]);
  });

  it("no file in src/lib/services/scoring/ imports from @/lib/services/lead-intel", () => {
    const files = walk(SCORING);
    const violations = filesImporting(files, [
      'from "@/lib/services/lead-intel',
      "from '@/lib/services/lead-intel",
    ]);
    expect(violations, `LG-07 violation (reverse) — remove these imports:\n${violations.join("\n")}`).toEqual([]);
  });

  it("no file in src/lib/services/property/ imports from @/lib/services/lead-intel", () => {
    const files = walk(PROPERTY);
    const violations = filesImporting(files, [
      'from "@/lib/services/lead-intel',
      "from '@/lib/services/lead-intel",
    ]);
    expect(violations, `LG-07 violation (reverse) — remove these imports:\n${violations.join("\n")}`).toEqual([]);
  });
});
