import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/auth/current-user";
import type { PlagiarismCheckDetail, MatchedSection, SimilarityClassification } from "@/types/plagiarism";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser();
    const check = await prisma.plagiarismCheck.findUnique({ where: { id: params.id } });
    // Same "not found" for missing vs. not-owned — never reveals that an ID
    // belongs to someone else.
    if (!check || check.userId !== user.id) {
      throw new ApiError("NOT_FOUND", "Plagiarism check not found.");
    }

    const detail: PlagiarismCheckDetail = {
      id: check.id,
      title: check.title,
      language: check.language,
      sourceCode: check.sourceCode,
      comparisonCode: check.comparisonCode,
      similarityScore: check.similarityScore,
      classification: check.classification as SimilarityClassification,
      matchedSections: check.matchedSections as unknown as MatchedSection[],
      explanation: check.explanation,
      breakdown: {
        rawTokenSimilarity: check.rawTokenSimilarity,
        normalizedTokenSimilarity: check.normalizedTokenSimilarity,
        matchedCoverage: check.matchedCoverage,
      },
      createdAt: check.createdAt.toISOString(),
    };

    return NextResponse.json({ check: detail });
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
    const existing = await prisma.plagiarismCheck.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== user.id) {
      throw new ApiError("NOT_FOUND", "Plagiarism check not found.");
    }
    await prisma.plagiarismCheck.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
