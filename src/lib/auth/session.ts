import crypto from "crypto";

/** Name of the httpOnly cookie that carries the raw session token. */
export const SESSION_COOKIE_NAME = "codesage_session";

/** Sessions are valid for 30 days from creation. */
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Generates a new, cryptographically random session token.
 * The RAW token is what gets set in the browser cookie. Only its SHA-256
 * HASH is ever persisted to the database (see `hashSessionToken`), so a
 * database read alone can never be used to forge a valid session — this is
 * the same principle as password hashing, applied to session tokens.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Deterministically hashes a raw session token for storage/lookup. */
export function hashSessionToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/** Cookie options shared by "set" (login/register) and "clear" (logout). */
export function sessionCookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds } : {}),
  };
}
