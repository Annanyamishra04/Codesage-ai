import bcrypt from "bcryptjs";

/**
 * Cost factor for bcrypt hashing. 12 is a strong default for 2026 hardware
 * while still keeping login latency acceptable on free-tier serverless
 * functions (well under a second).
 */
const SALT_ROUNDS = 12;

/** Hashes a plain-text password. Never store or log the plain-text value. */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

/** Verifies a plain-text password against a stored bcrypt hash. */
export async function verifyPassword(
  plainTextPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
