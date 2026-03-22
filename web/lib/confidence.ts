export type ConfidenceLevel = "high" | "medium" | "low";

export function parseConfidence(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (Number.isNaN(n)) return null;
  return Math.min(1, Math.max(0, n));
}

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

export function confidenceClasses(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300";
    case "medium":
      return "bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-200";
    case "low":
      return "bg-rose-500/15 text-rose-800 ring-rose-500/30 dark:text-rose-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}
