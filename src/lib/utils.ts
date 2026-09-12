import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function scoreColorClass(score: number): string {
  if (score >= 90) return "text-success";
  if (score >= 75) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

export type ScoreLabel = "Excellent" | "Good" | "Needs Improvement" | "Significant Issues";

/**
 * Derives the human-readable quality label for an overall score.
 * Kept as a single source of truth so the label is always consistent
 * wherever a score is shown (results panel, history list, review detail).
 *
 * 90–100 -> Excellent, 75–89 -> Good, 60–74 -> Needs Improvement, <60 -> Significant Issues
 */
export function scoreLabel(score: number): ScoreLabel {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Needs Improvement";
  return "Significant Issues";
}

/** Relative time (e.g. "3 hours ago") for recent dates, falling back to an absolute date further out. */
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(iso);
}
