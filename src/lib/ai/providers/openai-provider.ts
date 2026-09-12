import type { AIProvider, ReviewCodeInput } from "@/lib/ai/types";
import { AIProviderError, AIResponseValidationError } from "@/lib/ai/types";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { aiCodeReviewSchema } from "@/lib/validators/schemas";
import { finalizeAiResult } from "@/lib/ai/finalize";
import { stripCodeFences } from "@/lib/ai/strip-code-fences";
import type { CodeReviewResult } from "@/types/review";

interface OpenAIProviderConfig {
  apiKey: string;
  model: string;
  /** Allows pointing at any OpenAI-compatible endpoint (OpenRouter, Groq, local LLM servers, etc). */
  baseUrl?: string;
}

/**
 * Works with the OpenAI Chat Completions API and any OpenAI-compatible
 * endpoint (OpenRouter, Groq, Together, local llama.cpp servers, etc.) by
 * changing AI_BASE_URL — no code changes needed.
 */
export class OpenAIProvider implements AIProvider {
  readonly name: string;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: OpenAIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
    this.name = `openai:${config.model}`;
  }

  async reviewCode({ code, language }: ReviewCodeInput): Promise<CodeReviewResult> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(code, language) },
          ],
        }),
      });
    } catch (err) {
      throw new AIProviderError("Failed to reach the AI provider.", err);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new AIProviderError(
        `AI provider returned an error (status ${res.status}).`,
        text
      );
    }

    const data = await res.json().catch((err) => {
      throw new AIProviderError("AI provider returned a non-JSON response.", err);
    });

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new AIProviderError("AI provider response was missing message content.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stripCodeFences(content));
    } catch (err) {
      throw new AIResponseValidationError(
        "AI provider response was not valid JSON.",
        err
      );
    }

    const result = aiCodeReviewSchema.safeParse(parsedJson);
    if (!result.success) {
      throw new AIResponseValidationError(
        "AI provider response did not match the expected schema.",
        result.error.flatten()
      );
    }

    return finalizeAiResult(result.data);
  }
}
