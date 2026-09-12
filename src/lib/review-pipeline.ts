import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai/get-provider";
import { runStaticAnalysis } from "@/lib/static-analysis/rules";
import { ApiError } from "@/lib/api-error";
import { AIProviderError, AIResponseValidationError } from "@/lib/ai/types";
import type { CreateReviewRequest } from "@/lib/validators/schemas";
import type { CodeIssue, ReviewDetail } from "@/types/review";
import type { Prisma } from "@prisma/client";

/**
 * Collapses AI and static-analysis issues that describe the same underlying
 * problem so the user doesn't see the identical warning twice. Two issues are
 * treated as duplicates when they flag the same category on the same (or an
 * overlapping) line with a near-identical title. AI issues are preferred when
 * a duplicate is found, since they usually carry richer explanations, but the
 * `source` is intentionally left as-is so "AI vs static" attribution stays
 * accurate for whichever one is kept.
 */
export function dedupeIssues(issues: CodeIssue[]): CodeIssue[] {
  const normalizeTitle = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const overlaps = (a: CodeIssue, b: CodeIssue) => {
    if (a.lineStart == null || b.lineStart == null) return a.lineStart === b.lineStart;
    const aEnd = a.lineEnd ?? a.lineStart;
    const bEnd = b.lineEnd ?? b.lineStart;
    return a.lineStart <= bEnd && b.lineStart <= aEnd;
  };

  const kept: CodeIssue[] = [];
  for (const issue of issues) {
    const dupIndex = kept.findIndex(
      (existing) =>
        existing.category === issue.category &&
        overlaps(existing, issue) &&
        normalizeTitle(existing.title) === normalizeTitle(issue.title)
    );
    if (dupIndex === -1) {
      kept.push(issue);
      continue;
    }
    // Prefer the AI-sourced version of a duplicate when one exists, since it
    // typically has a more specific description/fix; otherwise keep the first.
    if (issue.source === "ai" && kept[dupIndex].source !== "ai") {
      kept[dupIndex] = issue;
    }
  }
  return kept;
}

/**
 * Runs the full review pipeline described in the spec:
 * validation (done by caller via Zod) -> static analysis -> AI provider ->
 * structured response validation -> persistence -> return review.
 */
export async function runReviewPipeline(
  input: CreateReviewRequest,
  userId: string
): Promise<ReviewDetail> {
  const { code, language } = input;

  // Static analysis runs first and is always available, even if the AI call fails.
  const staticIssues = runStaticAnalysis(code, language);

  const provider = getAIProvider();

  let aiResult;
  try {
    aiResult = await provider.reviewCode({ code, language });
  } catch (err) {
    if (err instanceof AIResponseValidationError) {
      console.error("[CodeSage AI] AI response failed validation:", err.issues);
      throw new ApiError(
        "AI_RESPONSE_INVALID",
        "The AI provider returned a response we couldn't understand. Please try again."
      );
    }
    if (err instanceof AIProviderError) {
      console.error("[CodeSage AI] AI provider error:", err.cause ?? err.message);
      throw new ApiError(
        "AI_PROVIDER_ERROR",
        "The AI provider failed to complete this review. Please try again shortly."
      );
    }
    console.error("[CodeSage AI] Unexpected error calling AI provider:", err);
    throw new ApiError(
      "AI_PROVIDER_ERROR",
      "An unexpected error occurred while generating the review."
    );
  }

  const mergedIssues = dedupeIssues([...aiResult.issues, ...staticIssues]);

  let saved;
  try {
    saved = await prisma.review.create({
      data: {
        language,
        originalCode: code,
        summary: aiResult.summary,
        overallScore: aiResult.overallScore,
        securityScore: aiResult.scores.security,
        performanceScore: aiResult.scores.performance,
        maintainabilityScore: aiResult.scores.maintainability,
        readabilityScore: aiResult.scores.readability,
        issues: mergedIssues as unknown as Prisma.InputJsonValue,
        strengths: aiResult.strengths as unknown as Prisma.InputJsonValue,
        refactoredCode: aiResult.refactoredCode,
        finalRecommendation: aiResult.finalRecommendation,
        aiProvider: provider.name,
        userId,
      },
    });
  } catch (err) {
    console.error("[CodeSage AI] Database error while saving review:", err);
    throw new ApiError(
      "DATABASE_ERROR",
      "The review was generated but could not be saved. Please try again."
    );
  }

  return {
    id: saved.id,
    language: saved.language,
    originalCode: saved.originalCode,
    summary: saved.summary,
    overallScore: saved.overallScore,
    scores: {
      security: saved.securityScore,
      performance: saved.performanceScore,
      maintainability: saved.maintainabilityScore,
      readability: saved.readabilityScore,
    },
    issues: mergedIssues,
    strengths: aiResult.strengths,
    refactoredCode: saved.refactoredCode,
    finalRecommendation: saved.finalRecommendation,
    aiProvider: saved.aiProvider,
    createdAt: saved.createdAt.toISOString(),
    updatedAt: saved.updatedAt.toISOString(),
  };
}
