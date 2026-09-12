import type { AIProvider, ReviewCodeInput } from "@/lib/ai/types";
import { AIProviderError, AIResponseValidationError } from "@/lib/ai/types";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import { aiCodeReviewSchema } from "@/lib/validators/schemas";
import { finalizeAiResult } from "@/lib/ai/finalize";
import { stripCodeFences } from "@/lib/ai/strip-code-fences";
import type { CodeReviewResult } from "@/types/review";

interface AnthropicProviderConfig {
  apiKey: string;
  model: string;
}

export class AnthropicProvider implements AIProvider {
  readonly name: string;
  private apiKey: string;
  private model: string;

  constructor(config: AnthropicProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.name = `anthropic:${config.model}`;
  }

  async reviewCode({ code, language }: ReviewCodeInput): Promise<CodeReviewResult> {
    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildUserPrompt(code, language) }],
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

    const content = data?.content?.[0]?.text;
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
