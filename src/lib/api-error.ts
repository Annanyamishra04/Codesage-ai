import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_LANGUAGE"
  | "CODE_TOO_LARGE"
  | "EMPTY_CODE"
  | "AI_CONFIG_MISSING"
  | "AI_PROVIDER_ERROR"
  | "AI_RESPONSE_INVALID"
  | "DATABASE_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "EMAIL_IN_USE"
  | "INVALID_CREDENTIALS"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNSUPPORTED_LANGUAGE: 400,
  CODE_TOO_LARGE: 413,
  EMPTY_CODE: 400,
  AI_CONFIG_MISSING: 500,
  AI_PROVIDER_ERROR: 502,
  AI_RESPONSE_INVALID: 502,
  DATABASE_ERROR: 500,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  EMAIL_IN_USE: 409,
  INVALID_CREDENTIALS: 401,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

/** Builds a consistent JSON error response: { error: { code, message } } */
export function errorResponse(code: ApiErrorCode, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status: STATUS_BY_CODE[code] }
  );
}

/** Wraps a route handler, converting thrown ApiErrors (or unknown errors) into responses. */
export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return errorResponse(err.code, err.message);
  }
  // Never leak internal error details to the client.
  console.error("[CodeSage AI] Unhandled API error:", err);
  return errorResponse(
    "INTERNAL_ERROR",
    "Something went wrong while processing your request."
  );
}
