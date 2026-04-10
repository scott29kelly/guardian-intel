/**
 * Address Normalization
 *
 * Pure functions for deterministic address normalization. Used by entity
 * resolution (LG-03) and the backfill extractors to generate stable dedup
 * keys. No I/O — given the same input, always returns the same output.
 *
 * Rules (LG-03):
 *  - lowercase
 *  - collapse whitespace to single space and trim
 *  - expand standard US street-type and directional abbreviations
 *    ("st" -> "street", "rd" -> "road", "n" -> "north", etc.)
 *  - strip punctuation (commas, periods, apostrophes) except `#` in unit numbers
 *  - do NOT reorder tokens — "123 N Main St" normalizes left-to-right
 */

// Street-type abbreviation expansion — common USPS two-letter + colloquial forms
const STREET_TYPE: Record<string, string> = {
  st: "street",
  str: "street",
  rd: "road",
  ave: "avenue",
  av: "avenue",
  blvd: "boulevard",
  ln: "lane",
  dr: "drive",
  ct: "court",
  pl: "place",
  pkwy: "parkway",
  hwy: "highway",
  ter: "terrace",
  trl: "trail",
  cir: "circle",
  cres: "crescent",
  way: "way",
};

// Directional expansion — both full and abbreviated
const DIRECTIONAL: Record<string, string> = {
  n: "north",
  s: "south",
  e: "east",
  w: "west",
  ne: "northeast",
  nw: "northwest",
  se: "southeast",
  sw: "southwest",
};

// Unit-prefix tokens we keep as-is so `#4` and `apt 2` don't collide
const UNIT_PREFIXES = new Set(["apt", "unit", "suite", "ste", "#"]);

export function normalizeAddress(raw: string | null | undefined): string {
  if (!raw) return "";

  // 1. lowercase + strip punctuation (keep `#`)
  let s = raw.toLowerCase().replace(/[.,'"]/g, " ");

  // 2. collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  // 3. tokenize, expand abbreviations token-by-token
  const tokens = s.split(" ");
  const expanded = tokens.map((tok, idx) => {
    // Unit prefixes pass through
    if (UNIT_PREFIXES.has(tok)) return tok;
    // Leading directional (first token after the number) — expand
    if (idx > 0 && DIRECTIONAL[tok]) return DIRECTIONAL[tok];
    // Street types — expand
    if (STREET_TYPE[tok]) return STREET_TYPE[tok];
    return tok;
  });

  // 4. re-collapse whitespace (in case expansion produced empties)
  return expanded.filter(Boolean).join(" ");
}

/**
 * Build the hard dedup key used by TrackedProperty.normalizedKey.
 * Combines normalized street address with the ZIP so "123 Main St"
 * in two different cities can still be distinguished.
 */
export function buildNormalizedKey(address: string, zipCode: string): string {
  return `${normalizeAddress(address)}|${(zipCode || "").trim()}`;
}

/**
 * Extract the leading street number from a normalized address
 * (for the geo-near+street-number+ZIP resolver branch).
 */
export function extractStreetNumber(normalized: string): string | null {
  const m = normalized.match(/^(\d+)\b/);
  return m ? m[1] : null;
}
