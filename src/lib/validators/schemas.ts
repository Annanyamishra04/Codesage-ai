import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "@/types/review";

/** Maximum characters of source code accepted per review request. */
export const MAX_CODE_LENGTH = 20000;
export const MIN_CODE_LENGTH = 1;

export const severityEnum = z.enum(["critical", "high", "medium", "low"]);
export const categoryEnum = z.enum([
  "bug",
  "security",
  "performance",
  "code_quality",
  "maintainability",
]);
export const sourceEnum = z.enum(["ai", "static_analysis"]);

/**
 * Strict schema for a single issue as returned by the AI provider.
 * `id` and `source` are optional here because the AI never knows about
 * `source` (we tag it ourselves) and may omit `id` (we backfill it).
 */
export const aiIssueSchema = z.object({
  id: z.string().optional(),
  severity: severityEnum,
  category: categoryEnum,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  lineStart: z.number().int().nullable().optional().default(null),
  lineEnd: z.number().int().nullable().optional().default(null),
  whyItMatters: z.string().min(1).max(2000),
  suggestedFix: z.string().min(1).max(2000),
});

/** Full structured output the AI provider must produce. */
export const aiCodeReviewSchema = z.object({
  summary: z.string().min(1).max(3000),
  overallScore: z.number().int().min(0).max(100),
  scores: z.object({
    security: z.number().int().min(0).max(100),
    performance: z.number().int().min(0).max(100),
    maintainability: z.number().int().min(0).max(100),
    readability: z.number().int().min(0).max(100),
  }),
  issues: z.array(aiIssueSchema).default([]),
  strengths: z.array(z.string().min(1).max(500)).default([]),
  refactoredCode: z.string().default(""),
  finalRecommendation: z.string().min(1).max(2000),
});

export type AiCodeReviewParsed = z.infer<typeof aiCodeReviewSchema>;

/** Request body for POST /api/reviews */
export const createReviewRequestSchema = z.object({
  code: z
    .string()
    .min(MIN_CODE_LENGTH, "Please provide some source code to review.")
    .max(
      MAX_CODE_LENGTH,
      `Code is too large. Please limit submissions to ${MAX_CODE_LENGTH.toLocaleString()} characters.`
    ),
  language: z.enum(SUPPORTED_LANGUAGES, {
    errorMap: () => ({ message: "Unsupported programming language." }),
  }),
});

export type CreateReviewRequest = z.infer<typeof createReviewRequestSchema>;

/** Query params for GET /api/reviews */
export const listReviewsQuerySchema = z.object({
  search: z.string().optional(),
  language: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/** Maximum characters accepted per snippet in the plagiarism checker. */
export const MAX_PLAGIARISM_CODE_LENGTH = 20000;

/** Request body for POST /api/plagiarism/check (analysis only, not persisted). */
export const checkSimilarityRequestSchema = z.object({
  sourceCode: z
    .string()
    .min(1, "Please provide the code you want to check.")
    .max(
      MAX_PLAGIARISM_CODE_LENGTH,
      `Code is too large. Please limit each snippet to ${MAX_PLAGIARISM_CODE_LENGTH.toLocaleString()} characters.`
    ),
  comparisonCode: z
    .string()
    .min(1, "Please provide code to compare against.")
    .max(
      MAX_PLAGIARISM_CODE_LENGTH,
      `Code is too large. Please limit each snippet to ${MAX_PLAGIARISM_CODE_LENGTH.toLocaleString()} characters.`
    ),
  language: z.enum(SUPPORTED_LANGUAGES, {
    errorMap: () => ({ message: "Unsupported programming language." }),
  }),
});
export type CheckSimilarityRequest = z.infer<typeof checkSimilarityRequestSchema>;

/** Request body for POST /api/plagiarism (persists a check, optionally re-running analysis). */
export const savePlagiarismCheckRequestSchema = checkSimilarityRequestSchema.extend({
  title: z.string().trim().min(1).max(120).optional(),
});
export type SavePlagiarismCheckRequest = z.infer<typeof savePlagiarismCheckRequestSchema>;

/** Query params for GET /api/plagiarism */
export const listPlagiarismQuerySchema = z.object({
  search: z.string().optional(),
  language: z.string().optional(),
  classification: z.enum(["very_low", "low", "moderate", "high", "very_high"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});
