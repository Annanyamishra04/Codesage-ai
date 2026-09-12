import type { CodeReviewResult, SupportedLanguage } from "@/types/review";

export interface ReviewCodeInput {
  code: string;
  language: SupportedLanguage;
}

/**
 * The contract every AI provider must implement. Business logic in the API
 * routes depends ONLY on this interface, never on a concrete provider, so
 * swapping AI_PROVIDER in the environment requires no code changes.
 */
export interface AIProvider {
  /** Human-readable identifier, persisted on the Review row for traceability. */
  readonly name: string;
  reviewCode(input: ReviewCodeInput): Promise<CodeReviewResult>;
}

export class AIProviderError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class AIResponseValidationError extends Error {
  constructor(message: string, public issues?: unknown) {
    super(message);
    this.name = "AIResponseValidationError";
  }
}
