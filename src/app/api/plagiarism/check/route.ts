import { NextRequest, NextResponse } from "next/server";
import { handleApiError, ApiError } from "@/lib/api-error";
import { requireUser } from "@/lib/auth/current-user";
import { checkSimilarityRequestSchema } from "@/lib/validators/schemas";
import { compareCode } from "@/lib/plagiarism/similarity";

export const runtime = "nodejs";

/**
 * Runs a similarity analysis and returns the result WITHOUT persisting it.
 * The UI's "Check Similarity" action calls this; a separate explicit
 * "Save to history" action calls POST /api/plagiarism to persist.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Request body must be valid JSON.");
    }

    const parsed = checkSimilarityRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid request."
      );
    }

    const { sourceCode, comparisonCode, language } = parsed.data;
    const analysis = compareCode(sourceCode, comparisonCode, { language });

    return NextResponse.json({ analysis });
  } catch (err) {
    return handleApiError(err);
  }
}
