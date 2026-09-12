import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-error";
import { loginRequestSchema } from "@/lib/validators/auth-schemas";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  generateSessionToken,
  hashSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import type { PublicUser } from "@/types/user";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Request body must be valid JSON.");
    }

    const parsed = loginRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid request."
      );
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // Intentionally identical error for "no such user" and "wrong password"
    // so a login form can never be used to enumerate which emails have
    // accounts. We still run bcrypt.compare against a dummy hash when the
    // user doesn't exist, so the response time doesn't leak that either.
    const passwordHash = user?.passwordHash ?? "$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltuv";
    const passwordMatches = await verifyPassword(password, passwordHash);

    if (!user || !passwordMatches) {
      throw new ApiError("INVALID_CREDENTIALS", "Incorrect email or password.");
    }

    const rawToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await prisma.session.create({
      data: { tokenHash: hashSessionToken(rawToken), userId: user.id, expiresAt },
    });

    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };

    const res = NextResponse.json({ user: publicUser });
    res.cookies.set(
      SESSION_COOKIE_NAME,
      rawToken,
      sessionCookieOptions(SESSION_DURATION_MS / 1000)
    );
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
