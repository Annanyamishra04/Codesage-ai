/**
 * Strips a surrounding ```json ... ``` (or plain ``` ... ```) code fence that
 * LLMs sometimes wrap structured JSON responses in, despite being asked for
 * raw JSON. Returns the input unchanged if no fence is present.
 */
export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}
