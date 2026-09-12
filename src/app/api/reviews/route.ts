import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-error";
import {
  createReviewRequestSchema,
  listReviewsQuerySchema,
} from "@/lib/validators/schemas";
import { runReviewPipeline } from "@/lib/review-pipeline";
import { requireUser } from "@/lib/auth/current-user";
import type { Prisma } from "@prisma/client";
import type { ReviewListItem } from "@/types/review";

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

    const parsed = createReviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      throw new ApiError(
        "VALIDATION_ERROR",
        firstIssue?.message ?? "Invalid request."
      );
    }

    const review = await runReviewPipeline(parsed.data, user.id);
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(req.url);
    const parsed = listReviewsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid query parameters.");
    }
    const { search, language, minScore, maxScore, page, pageSize } = parsed.data;

    // Every list query is scoped to the signed-in user server-side — a
    // user can never see another user's reviews just by omitting/changing
    // filters, because `userId` is not a client-controllable parameter.
    const where: Prisma.ReviewWhereInput = { userId: user.id };
    if (language) where.language = language;
    if (minScore !== undefined || maxScore !== undefined) {
      where.overallScore = {
        ...(minScore !== undefined ? { gte: minScore } : {}),
        ...(maxScore !== undefined ? { lte: maxScore } : {}),
      };
    }
    if (search) {
      where.OR = [
        { summary: { contains: search, mode: "insensitive" } },
        { language: { contains: search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          language: true,
          overallScore: true,
          summary: true,
          issues: true,
          createdAt: true,
        },
      }),
      prisma.review.count({ where }),
    ]);

    const items: ReviewListItem[] = rows.map((r: (typeof rows)[number]) => ({
      id: r.id,
      language: r.language,
      overallScore: r.overallScore,
      issueCount: Array.isArray(r.issues) ? r.issues.length : 0,
      summary: r.summary,
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
