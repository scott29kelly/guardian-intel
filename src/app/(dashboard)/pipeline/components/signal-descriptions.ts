/**
 * Plain-English signal description helpers for the Lead Generator.
 *
 * Converts internal signal types and their metadata into human-readable
 * descriptions that sales reps can scan quickly.
 */

export function describeSignal(
  signalType: string,
  value: number | null,
  metadata: string | null,
  ageDays?: number,
): string {
  const meta = parseMetadata(metadata);
  switch (signalType) {
    case "roof-age":
      return value ? `Roof is ${Math.round(value)} years old` : "Roof age detected";
    case "storm-exposure": {
      const severity = meta.severity ? `${capitalize(meta.severity)} ` : "";
      return `${severity}storm nearby`;
    }
    case "neighbor-win": {
      const miles = value ? (value / 1609.34).toFixed(1) : "?";
      return `Neighbor closed deal ${miles}mi away`;
    }
    case "canvassing-recency":
      return ageDays != null ? `Canvassed ${ageDays} days ago` : "Recently canvassed";
    case "crm-contact-recency":
      return ageDays != null ? `Last CRM contact ${ageDays} days ago` : "CRM contact logged";
    default:
      return signalType;
  }
}

export const SIGNAL_LABEL: Record<string, string> = {
  "roof-age": "Roof Age",
  "storm-exposure": "Storm Exposure",
  "canvassing-recency": "Canvassing",
  "crm-contact-recency": "CRM Contact",
  "neighbor-win": "Nearby Win",
};

function parseMetadata(metadata: string | null): Record<string, string> {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
