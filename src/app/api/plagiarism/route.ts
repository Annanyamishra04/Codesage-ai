import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/auth/current-user";
import {
  savePlagiarismCheckRequestSchema,
  listPlagiarismQuerySchema,
} from "@/lib/validators/schemas";
import { compareCode } from "@/lib/plagiarism/similarity";
import type { Prisma } from "@prisma/client";
import type { PlagiarismCheckDetail, PlagiarismCheckListItem, MatchedSection, SimilarityClassification } from "@/types/plagiarism";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Request body must be valid JSON.");
    }

    const parsed = savePlagiarismCheckRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid request."
      );
    }

    const { sourceCode, comparisonCode, language, title } = parsed.data;
    const analysis = compareCode(sourceCode, comparisonCode, { language });

    let saved;
    try {
      saved = await prisma.plagiarismCheck.create({
        data: {
          title: title?.trim() || "Untitled comparison",
          language,
          sourceCode,
          comparisonCode,
          similarityScore: analysis.similarityScore,
          classification: analysis.classification,
          rawTokenSimilarity: analysis.breakdown.rawTokenSimilarity,
          normalizedTokenSimilarity: analysis.breakdown.normalizedTokenSimilarity,
          matchedCoverage: analysis.breakdown.matchedCoverage,
          matchedSections: analysis.matchedSections as unknown as Prisma.InputJsonValue,
          explanation: analysis.explanation,
          userId: user.id,
        },
      });
    } catch (err) {
      console.error("[CodeSage AI] Database error while saving plagiarism check:", err);
      throw new ApiError(
        "DATABASE_ERROR",
        "The comparison was completed but could not be saved. Please try again."
      );
    }

    const detail: PlagiarismCheckDetail = {
      id: saved.id,
      title: saved.title,
      language: saved.language,
      sourceCode: saved.sourceCode,
      comparisonCode: saved.comparisonCode,
      similarityScore: saved.similarityScore,
      classification: saved.classification as SimilarityClassification,
      matchedSections: saved.matchedSections as unknown as MatchedSection[],
      explanation: saved.explanation,
      breakdown: analysis.breakdown,
      createdAt: saved.createdAt.toISOString(),
    };

    return NextResponse.json({ check: detail }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(req.url);
    const parsed = listPlagiarismQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid query parameters.");
    }
    const { search, language, classification, page, pageSize } = parsed.data;

    // Scoped to the signed-in user server-side, same as /api/reviews.
    const where: Prisma.PlagiarismCheckWhereInput = { userId: user.id };
    if (language) where.language = language;
    if (classification) where.classification = classification;
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const [rows, total] = await Promise.all([
      prisma.plagiarismCheck.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          language: true,
          similarityScore: true,
          classification: true,
          createdAt: true,
        },
      }),
      prisma.plagiarismCheck.count({ where }),
    ]);

    const items: PlagiarismCheckListItem[] = rows.map((r: (typeof rows)[number]) => ({
      id: r.id,
      title: r.title,
      language: r.language,
      similarityScore: r.similarityScore,
      classification: r.classification as SimilarityClassification,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
