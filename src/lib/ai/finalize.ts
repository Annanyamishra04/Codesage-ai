import type { AiCodeReviewParsed } from "@/lib/validators/schemas";
import type { CodeReviewResult } from "@/types/review";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `ai-${Date.now()}-${counter}`;
}

/** Converts a validated raw AI response into our internal CodeReviewResult shape. */
export function finalizeAiResult(parsed: AiCodeReviewParsed): CodeReviewResult {
  return {
    summary: parsed.summary,
    overallScore: parsed.overallScore,
    scores: parsed.scores,
    strengths: parsed.strengths,
    refactoredCode: parsed.refactoredCode,
    finalRecommendation: parsed.finalRecommendation,
    issues: parsed.issues.map((issue) => ({
      id: issue.id ?? nextId(),
      severity: issue.severity,
      category: issue.category,
      title: issue.title,
      description: issue.description,
      lineStart: issue.lineStart ?? null,
      lineEnd: issue.lineEnd ?? null,
      whyItMatters: issue.whyItMatters,
      suggestedFix: issue.suggestedFix,
      source: "ai" as const,
    })),
  };
}
