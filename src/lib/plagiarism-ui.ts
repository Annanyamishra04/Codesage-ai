import type { SimilarityClassification } from "@/types/plagiarism";

/** Tailwind text-color class per classification, matching the existing score-color pattern in lib/utils. */
export function classificationColorClass(classification: SimilarityClassification): string {
  switch (classification) {
    case "very_high":
      return "text-destructive";
    case "high":
      return "text-destructive";
    case "moderate":
      return "text-warning";
    case "low":
      return "text-primary";
    case "very_low":
    default:
      return "text-success";
  }
}

/** Tailwind badge/background class per classification, for progress bars and badges. */
export function classificationBgClass(classification: SimilarityClassification): string {
  switch (classification) {
    case "very_high":
      return "bg-destructive";
    case "high":
      return "bg-destructive";
    case "moderate":
      return "bg-warning";
    case "low":
      return "bg-primary";
    case "very_low":
    default:
      return "bg-success";
  }
}
