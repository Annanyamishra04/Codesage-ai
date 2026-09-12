import type { AIProvider } from "@/lib/ai/types";
import { MockAIProvider } from "@/lib/ai/providers/mock-provider";
import { OpenAIProvider } from "@/lib/ai/providers/openai-provider";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic-provider";
import { ApiError } from "@/lib/api-error";
import { defaultModelFor, providerRequiresApiKey, resolveAiProviderName } from "@/lib/env";

let cachedProvider: AIProvider | null = null;

/**
 * Reads AI_PROVIDER / AI_API_KEY / AI_MODEL / AI_BASE_URL from the environment
 * and returns the corresponding AIProvider implementation. This is the ONLY
 * place in the app that branches on provider type — everywhere else just
 * calls `provider.reviewCode(...)`.
 *
 * Falls back to the mock provider whenever AI_PROVIDER is unset, "mock", or
 * an unrecognized value (logged via resolveAiProviderName). A recognized
 * real provider missing its required AI_API_KEY throws a clear,
 * developer-friendly AI_CONFIG_MISSING error rather than failing deep inside
 * a fetch call.
 */
export function getAIProvider(): AIProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = resolveAiProviderName();
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL?.trim() || undefined;
  const baseUrl = process.env.AI_BASE_URL;

  if (providerRequiresApiKey(providerName) && !apiKey) {
    throw new ApiError(
      "AI_CONFIG_MISSING",
      `AI_PROVIDER is set to '${providerName}' but AI_API_KEY is missing. Set AI_API_KEY in your environment, or set AI_PROVIDER=mock to use the built-in demo provider.`
    );
  }

  switch (providerName) {
    case "openai":
    case "openai-compatible": {
      cachedProvider = new OpenAIProvider({
        apiKey: apiKey as string,
        model: model ?? defaultModelFor(providerName),
        baseUrl,
      });
      return cachedProvider;
    }
    case "anthropic": {
      cachedProvider = new AnthropicProvider({
        apiKey: apiKey as string,
        model: model ?? defaultModelFor(providerName),
      });
      return cachedProvider;
    }
    case "mock":
    default:
      cachedProvider = new MockAIProvider();
      return cachedProvider;
  }
}

/** Whether the active provider is the mock/demo provider. Used to surface a "Demo Mode" badge in the UI. */
export function isDemoMode(): boolean {
  return resolveAiProviderName() === "mock";
}
