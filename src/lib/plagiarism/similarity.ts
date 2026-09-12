import { stripComments, tokenize, normalizeToken } from "@/lib/plagiarism/tokenize";
import type { MatchedSection, SimilarityAnalysis, SimilarityClassification } from "@/types/plagiarism";

/** Shingle (n-gram) window size used for both Jaccard sets and match seeding. */
const SHINGLE_SIZE = 5;

/**
 * Classification thresholds — documented here as the single source of
 * truth and used everywhere a score is classified (this file, filters,
 * badges). Matches the product spec's five-tier bands exactly:
 *   0-20 Very Low · 21-40 Low · 41-60 Moderate · 61-80 High · 81-100 Very High
 */
const THRESHOLDS: Record<SimilarityClassification, number> = {
  very_high: 81,
  high: 61,
  moderate: 41,
  low: 21,
  very_low: 0,
};

export function classify(score: number): SimilarityClassification {
  if (score >= THRESHOLDS.very_high) return "very_high";
  if (score >= THRESHOLDS.high) return "high";
  if (score >= THRESHOLDS.moderate) return "moderate";
  if (score >= THRESHOLDS.low) return "low";
  return "very_low";
}

function shingles(tokens: string[], size: number): string[] {
  if (tokens.length < size) return tokens.length > 0 ? [tokens.join("\u0001")] : [];
  const result: string[] = [];
  for (let i = 0; i <= tokens.length - size; i += 1) {
    result.push(tokens.slice(i, i + size).join("\u0001"));
  }
  return result;
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const s of setA) {
    if (setB.has(s)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

interface RawMatch {
  aStart: number;
  aLen: number;
  bStart: number;
  bLen: number;
}

/**
 * Greedy, non-overlapping token-sequence matching (a simplified take on
 * "Greedy String Tiling" / the technique behind MOSS-style plagiarism
 * detectors): index every k-token shingle of `a`, then walk `b` looking for
 * shingle hits, extending each hit as far as it stays an exact match, and
 * marking matched tokens on both sides so no token is used twice. This
 * finds the longest common runs even when the copy has extra/removed lines
 * around the copied block, without the cost of a full O(n*m) alignment.
 */
function greedyMatch(a: string[], b: string[], k: number): RawMatch[] {
  const index = new Map<string, number[]>();
  for (let i = 0; i <= a.length - k; i += 1) {
    const key = a.slice(i, i + k).join("\u0001");
    const list = index.get(key);
    if (list) list.push(i);
    else index.set(key, [i]);
  }

  const usedA = new Uint8Array(a.length);
  const usedB = new Uint8Array(b.length);
  const matches: RawMatch[] = [];

  let j = 0;
  while (j <= b.length - k) {
    if (usedB[j]) {
      j += 1;
      continue;
    }
    const key = b.slice(j, j + k).join("\u0001");
    const candidates = index.get(key);
    if (!candidates || candidates.length === 0) {
      j += 1;
      continue;
    }

    let best: RawMatch | null = null;
    for (const i of candidates) {
      if (usedA[i]) continue;
      // Extend forward.
      let len = 0;
      while (
        i + len < a.length &&
        j + len < b.length &&
        !usedA[i + len] &&
        !usedB[j + len] &&
        a[i + len] === b[j + len]
      ) {
        len += 1;
      }
      if (len >= k && (!best || len > best.aLen)) {
        best = { aStart: i, aLen: len, bStart: j, bLen: len };
      }
    }

    if (best) {
      for (let x = 0; x < best.aLen; x += 1) usedA[best.aStart + x] = 1;
      for (let x = 0; x < best.bLen; x += 1) usedB[best.bStart + x] = 1;
      matches.push(best);
      j += best.bLen;
    } else {
      j += 1;
    }
  }

  return matches;
}

export interface CompareOptions {
  language: string;
}

/**
 * Compares two code snippets and returns a full similarity analysis.
 *
 * Scoring: a weighted blend of three independent signals (documented so the
 * score is never a "black box"):
 *   - rawTokenSimilarity (30%): Jaccard similarity of 5-token shingles on
 *     the comment/whitespace-stripped-but-otherwise-untouched token stream.
 *     Catches near-identical copies and formatting-only changes.
 *   - normalizedTokenSimilarity (35%): the same Jaccard measure computed
 *     after abstracting identifiers/numbers/strings to ID/NUM/STR. Catches
 *     copies where variables/functions were renamed or literals changed.
 *   - matchedCoverage (35%): the fraction of tokens (relative to snippet
 *     length) covered by greedy, non-overlapping matched runs on the
 *     normalized stream. Rewards long contiguous copied blocks specifically
 *     (as opposed to scattered coincidental token overlap).
 *
 * This is a heuristic, lexical comparison of the two submitted snippets
 * only — it does not search the internet, GitHub, or any external corpus.
 */
export function compareCode(
  sourceCode: string,
  comparisonCode: string,
  { language }: CompareOptions
): SimilarityAnalysis {
  const sourceTokens = tokenize(stripComments(sourceCode, language));
  const comparisonTokens = tokenize(stripComments(comparisonCode, language));

  if (sourceTokens.length === 0 || comparisonTokens.length === 0) {
    return {
      similarityScore: 0,
      classification: "very_low",
      matchedSections: [],
      explanation:
        "One of the submitted snippets contained no analyzable code (after removing comments and whitespace), so no meaningful comparison could be made.",
      breakdown: { rawTokenSimilarity: 0, normalizedTokenSimilarity: 0, matchedCoverage: 0 },
    };
  }

  const rawA = sourceTokens.map((t) => t.value);
  const rawB = comparisonTokens.map((t) => t.value);
  const normA = sourceTokens.map((t) => normalizeToken(t.value, language));
  const normB = comparisonTokens.map((t) => normalizeToken(t.value, language));

  const rawTokenSimilarity = jaccard(shingles(rawA, SHINGLE_SIZE), shingles(rawB, SHINGLE_SIZE));
  const normalizedTokenSimilarity = jaccard(
    shingles(normA, SHINGLE_SIZE),
    shingles(normB, SHINGLE_SIZE)
  );

  const rawMatches = greedyMatch(normA, normB, SHINGLE_SIZE);
  const totalMatchedTokens = rawMatches.reduce((sum, m) => sum + m.aLen, 0);
  const averageLength = (normA.length + normB.length) / 2;
  const matchedCoverage = averageLength === 0 ? 0 : Math.min(1, totalMatchedTokens / averageLength);

  const weighted =
    0.3 * rawTokenSimilarity + 0.35 * normalizedTokenSimilarity + 0.35 * matchedCoverage;
  const similarityScore = Math.round(Math.min(1, Math.max(0, weighted)) * 100);
  const classification = classify(similarityScore);

  const matchedSections: MatchedSection[] = rawMatches
    .map((m) => ({
      sourceStartLine: sourceTokens[m.aStart].line,
      sourceEndLine: sourceTokens[m.aStart + m.aLen - 1].line,
      comparisonStartLine: comparisonTokens[m.bStart].line,
      comparisonEndLine: comparisonTokens[m.bStart + m.bLen - 1].line,
      tokenLength: m.aLen,
    }))
    .sort((a, b) => b.tokenLength - a.tokenLength)
    .slice(0, 12);

  const explanation = buildExplanation({
    similarityScore,
    classification,
    rawTokenSimilarity,
    normalizedTokenSimilarity,
    matchedCoverage,
    matchedSectionCount: rawMatches.length,
  });

  return {
    similarityScore,
    classification,
    matchedSections,
    explanation,
    breakdown: {
      rawTokenSimilarity: Math.round(rawTokenSimilarity * 100),
      normalizedTokenSimilarity: Math.round(normalizedTokenSimilarity * 100),
      matchedCoverage: Math.round(matchedCoverage * 100),
    },
  };
}

function buildExplanation(args: {
  similarityScore: number;
  classification: SimilarityClassification;
  rawTokenSimilarity: number;
  normalizedTokenSimilarity: number;
  matchedCoverage: number;
  matchedSectionCount: number;
}): string {
  const { similarityScore, classification, rawTokenSimilarity, normalizedTokenSimilarity, matchedCoverage, matchedSectionCount } =
    args;

  const parts: string[] = [];

  const CLASSIFICATION_LABEL: Record<SimilarityClassification, string> = {
    very_high: "Very High Similarity",
    high: "High Similarity",
    moderate: "Moderate Similarity",
    low: "Low Similarity",
    very_low: "Very Low Similarity",
  };
  parts.push(`Overall similarity: ${similarityScore}% (${CLASSIFICATION_LABEL[classification]}).`);

  if (matchedSectionCount === 0) {
    parts.push("No contiguous matching sections of meaningful length were found between the two snippets.");
  } else {
    parts.push(
      `Found ${matchedSectionCount} contiguous matching section${matchedSectionCount === 1 ? "" : "s"} covering roughly ${Math.round(
        matchedCoverage * 100
      )}% of the code.`
    );
  }

  if (normalizedTokenSimilarity > rawTokenSimilarity + 0.15) {
    parts.push(
      "Similarity increases notably once variable/function names and literal values are abstracted away — this pattern is typical of a copy where identifiers were renamed."
    );
  } else if (rawTokenSimilarity >= 0.6) {
    parts.push(
      "The two snippets match closely even before abstracting identifiers, suggesting the code is nearly identical or differs mainly in formatting/comments."
    );
  }

  parts.push(
    "This score reflects a lexical comparison of the two submitted snippets only (tokenization, identifier normalization, and matched-sequence coverage) — it is not a search of the internet, GitHub, or any external database."
  );

  return parts.join(" ");
}
