import type { SupportedLanguage } from "@/types/review";

export type SimilarityClassification = "very_low" | "low" | "moderate" | "high" | "very_high";

/**
 * Five-tier classification used consistently everywhere a similarity score
 * is shown (checker result, history list/detail, profile activity, filters).
 * Thresholds are defined once, in src/lib/plagiarism/similarity.ts, and
 * referenced from there — this map only owns display labels.
 */
export const CLASSIFICATION_LABELS: Record<SimilarityClassification, string> = {
  very_low: "Very Low Similarity",
  low: "Low Similarity",
  moderate: "Moderate Similarity",
  high: "High Similarity",
  very_high: "Very High Similarity",
};

/** A contiguous run of matched lines found in both snippets. */
export interface MatchedSection {
  sourceStartLine: number;
  sourceEndLine: number;
  comparisonStartLine: number;
  comparisonEndLine: number;
  /** Number of normalized tokens in this matched run — a rough size signal. */
  tokenLength: number;
}

/** Full result of a similarity analysis, independent of persistence. */
export interface SimilarityAnalysis {
  similarityScore: number; // 0-100
  classification: SimilarityClassification;
  matchedSections: MatchedSection[];
  explanation: string;
  /** Per-signal breakdown, surfaced in the UI for transparency. */
  breakdown: {
    rawTokenSimilarity: number;
    normalizedTokenSimilarity: number;
    matchedCoverage: number;
  };
}

export interface PlagiarismCheckDetail extends SimilarityAnalysis {
  id: string;
  title: string;
  language: SupportedLanguage | string;
  sourceCode: string;
  comparisonCode: string;
  createdAt: string;
}

export interface PlagiarismCheckListItem {
  id: string;
  title: string;
  language: string;
  similarityScore: number;
  classification: SimilarityClassification;
  createdAt: string;
}
