import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-error";
import { SESSION_COOKIE_NAME, hashSessionToken, sessionCookieOptions } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const rawToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (rawToken) {
      // Delete the specific session server-side so the token can never be
      // replayed again, not just clear the cookie client-side.
      await prisma.session
        .delete({ where: { tokenHash: hashSessionToken(rawToken) } })
        .catch(() => {
          // Session may already be gone (expired/cleaned up) — logging out
          // should still succeed from the client's perspective.
        });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE_NAME, "", { ...sessionCookieOptions(0) });
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
