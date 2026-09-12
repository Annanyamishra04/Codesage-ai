import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-error";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { PublicUser } from "@/types/user";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }
    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
    return NextResponse.json({ user: publicUser });
  } catch (err) {
    return handleApiError(err);
  }
}
