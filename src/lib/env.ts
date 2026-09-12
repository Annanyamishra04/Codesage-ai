/**
 * Lightweight, server-only environment validation helpers.
 *
 * Design goals:
 * - Never crash the app at *import* time (Next.js imports modules for pages
 *   that don't even need a database or AI provider, e.g. the landing page).
 * - Give developers a clear, actionable message the moment something IS
 *   actually needed but missing/misconfigured, instead of a raw driver error.
 * - Never read or expose secrets to the browser — this file must only ever
 *   be imported from server-side code (API routes, `src/lib`, RSCs).
 */

export const AI_PROVIDERS = ["mock", "openai", "openai-compatible", "anthropic"] as const;
export type AiProviderName = (typeof AI_PROVIDERS)[number];

const PROVIDERS_REQUIRING_API_KEY: ReadonlySet<string> = new Set([
  "openai",
  "openai-compatible",
  "anthropic",
]);

/**
 * Normalizes and validates AI_PROVIDER. Unknown values fall back to "mock"
 * (so a typo never hard-crashes the app) but are logged clearly so the
 * developer notices the misconfiguration.
 */
export function resolveAiProviderName(): AiProviderName {
  const raw = (process.env.AI_PROVIDER ?? "mock").trim().toLowerCase();
  if ((AI_PROVIDERS as readonly string[]).includes(raw)) {
    return raw as AiProviderName;
  }
  console.warn(
    `[CodeSage AI] AI_PROVIDER="${raw}" is not one of: ${AI_PROVIDERS.join(
      ", "
    )}. Falling back to "mock". Update AI_PROVIDER in your .env file to silence this warning.`
  );
  return "mock";
}

/** Whether the given provider name requires AI_API_KEY to be set. */
export function providerRequiresApiKey(provider: string): boolean {
  return PROVIDERS_REQUIRING_API_KEY.has(provider);
}

/**
 * Returns a sensible default model per provider when AI_MODEL is unset.
 * Kept here (rather than duplicated per-provider) so the fallback story is
 * consistent and easy to audit.
 */
export function defaultModelFor(provider: AiProviderName): string {
  switch (provider) {
    case "anthropic":
      return "claude-sonnet-4-6";
    case "openai":
    case "openai-compatible":
      return "gpt-4o-mini";
    case "mock":
    default:
      return "mock";
  }
}

let loggedMissingDatabaseUrl = false;

/**
 * Checks that DATABASE_URL is present. Does NOT throw — callers that
 * actually need the database (e.g. `src/lib/prisma.ts`) decide how to react.
 * This only centralizes the "is it configured?" check and a one-time,
 * developer-friendly console warning so repeated calls don't spam logs.
 */
export function isDatabaseConfigured(): boolean {
  const configured = Boolean(process.env.DATABASE_URL?.trim());
  if (!configured && !loggedMissingDatabaseUrl) {
    loggedMissingDatabaseUrl = true;
    console.error(
      "[CodeSage AI] DATABASE_URL is not set. Copy .env.example to .env and set " +
        "DATABASE_URL (and DATABASE_URL_UNPOOLED for migrations) to a PostgreSQL " +
        "connection string — a free Neon database works well. Any request that " +
        "touches the database will fail until this is configured."
    );
  }
  return configured;
}
