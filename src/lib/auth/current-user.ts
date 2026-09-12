import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { SESSION_COOKIE_NAME, hashSessionToken } from "@/lib/auth/session";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

/**
 * Resolves the current user from the httpOnly session cookie, if any.
 * Works in both Server Components and Route Handlers since both can read
 * `cookies()` from `next/headers`. Returns `null` when there is no session,
 * an expired session, or a session token that doesn't match any record —
 * it never throws for the "logged out" case.
 *
 * Expired sessions are lazily deleted on lookup rather than via a cron job,
 * which keeps the app free-tier friendly (no scheduled task needed).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const rawToken = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { id: true, name: true, email: true, createdAt: true },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    // Best-effort cleanup; failure here must never break the request.
    prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

/**
 * For use inside API route handlers. Returns the current user or throws an
 * `ApiError("UNAUTHORIZED", ...)` that `handleApiError` turns into a 401.
 * Server-side — never relies on the client to have hidden a button.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError("UNAUTHORIZED", "You must be signed in to do that.");
  }
  return user;
}

/**
 * For use inside Server Components that render protected pages
 * (Profile, Plagiarism Checker, History). Redirects to /login (preserving
 * the originally requested path via `next`) instead of throwing, since a
 * page component can't return a JSON error response.
 */
export async function requireUserOrRedirect(nextPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}
