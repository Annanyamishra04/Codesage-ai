import type {
  ApiErrorBody,
  ReviewDetail,
  ReviewListItem,
  SupportedLanguage,
} from "@/types/review";
import type { PlagiarismCheckDetail, PlagiarismCheckListItem, SimilarityAnalysis } from "@/types/plagiarism";
import type { PublicUser } from "@/types/user";

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data as ApiErrorBody | null)?.error?.message ?? "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return data as T;
}

export async function createReview(code: string, language: SupportedLanguage) {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, language }),
  });
  const data = await parseJsonOrThrow<{ review: ReviewDetail }>(res);
  return data.review;
}

export interface ListReviewsParams {
  search?: string;
  language?: string;
  minScore?: number;
  maxScore?: number;
  page?: number;
  pageSize?: number;
}

export interface ListReviewsResponse {
  items: ReviewListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listReviews(params: ListReviewsParams = {}) {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.language) search.set("language", params.language);
  if (params.minScore !== undefined) search.set("minScore", String(params.minScore));
  if (params.maxScore !== undefined) search.set("maxScore", String(params.maxScore));
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));

  const res = await fetch(`/api/reviews?${search.toString()}`);
  return parseJsonOrThrow<ListReviewsResponse>(res);
}

export async function getReview(id: string) {
  const res = await fetch(`/api/reviews/${id}`);
  const data = await parseJsonOrThrow<{ review: ReviewDetail }>(res);
  return data.review;
}

export async function deleteReview(id: string) {
  const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
  return parseJsonOrThrow<{ success: true }>(res);
}

export async function getConfig() {
  const res = await fetch("/api/config");
  return parseJsonOrThrow<{ demoMode: boolean }>(res);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function registerAccount(name: string, email: string, password: string) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await parseJsonOrThrow<{ user: PublicUser }>(res);
  return data.user;
}

export async function login(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonOrThrow<{ user: PublicUser }>(res);
  return data.user;
}

export async function logout() {
  const res = await fetch("/api/auth/logout", { method: "POST" });
  return parseJsonOrThrow<{ success: true }>(res);
}

export async function getCurrentUser() {
  const res = await fetch("/api/auth/me");
  const data = await parseJsonOrThrow<{ user: PublicUser | null }>(res);
  return data.user;
}

// ---------------------------------------------------------------------------
// Plagiarism checker
// ---------------------------------------------------------------------------

export interface CheckSimilarityInput {
  sourceCode: string;
  comparisonCode: string;
  language: SupportedLanguage;
}

export async function checkSimilarity(input: CheckSimilarityInput) {
  const res = await fetch("/api/plagiarism/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{ analysis: SimilarityAnalysis }>(res);
  return data.analysis;
}

export async function savePlagiarismCheck(input: CheckSimilarityInput & { title?: string }) {
  const res = await fetch("/api/plagiarism", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonOrThrow<{ check: PlagiarismCheckDetail }>(res);
  return data.check;
}

export interface ListPlagiarismParams {
  search?: string;
  language?: string;
  classification?: string;
  page?: number;
  pageSize?: number;
}

export interface ListPlagiarismResponse {
  items: PlagiarismCheckListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listPlagiarismChecks(params: ListPlagiarismParams = {}) {
  const search = new URLSearchParams();
  if (params.search) search.set("search", params.search);
  if (params.language) search.set("language", params.language);
  if (params.classification) search.set("classification", params.classification);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));

  const res = await fetch(`/api/plagiarism?${search.toString()}`);
  return parseJsonOrThrow<ListPlagiarismResponse>(res);
}

export async function getPlagiarismCheck(id: string) {
  const res = await fetch(`/api/plagiarism/${id}`);
  const data = await parseJsonOrThrow<{ check: PlagiarismCheckDetail }>(res);
  return data.check;
}

export async function deletePlagiarismCheck(id: string) {
  const res = await fetch(`/api/plagiarism/${id}`, { method: "DELETE" });
  return parseJsonOrThrow<{ success: true }>(res);
}
