import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, ApiError } from "@/lib/api-error";
import { registerRequestSchema } from "@/lib/validators/auth-schemas";
import { hashPassword } from "@/lib/auth/password";
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

    const parsed = registerRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message ?? "Invalid request."
      );
    }
    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Deliberately vague and 409, not a full account-enumeration leak of
      // "which field" — but a signup flow does need to tell the user their
      // email is already taken so they can log in instead.
      throw new ApiError("EMAIL_IN_USE", "An account with this email already exists.");
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

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

    const res = NextResponse.json({ user: publicUser }, { status: 201 });
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
