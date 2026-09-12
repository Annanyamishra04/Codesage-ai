import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/auth/current-user";
import type { ReviewDetail, CodeIssue } from "@/types/review";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const review = await prisma.review.findUnique({ where: { id: params.id } });
    // Same "not found" response whether the review truly doesn't exist or
    // it belongs to someone else — this is a deliberate ownership check,
    // not a bug: it never reveals that a given ID belongs to another user.
    if (!review || review.userId !== user.id) {
      throw new ApiError("NOT_FOUND", "Review not found.");
    }

    const detail: ReviewDetail = {
      id: review.id,
      language: review.language,
      originalCode: review.originalCode,
      summary: review.summary,
      overallScore: review.overallScore,
      scores: {
        security: review.securityScore,
        performance: review.performanceScore,
        maintainability: review.maintainabilityScore,
        readability: review.readabilityScore,
      },
      issues: review.issues as unknown as CodeIssue[],
      strengths: review.strengths as unknown as string[],
      refactoredCode: review.refactoredCode,
      finalRecommendation: review.finalRecommendation,
      aiProvider: review.aiProvider,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };

    return NextResponse.json({ review: detail });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const existing = await prisma.review.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== user.id) {
      throw new ApiError("NOT_FOUND", "Review not found.");
    }
    await prisma.review.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
