import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/ai/get-provider";

export const runtime = "nodejs";

/**
 * Exposes only non-sensitive, derived configuration to the client
 * (whether we're running in mock/demo mode). Never returns API keys,
 * provider names, or database connection info.
 */
export async function GET() {
  return NextResponse.json({ demoMode: isDemoMode() });
}
