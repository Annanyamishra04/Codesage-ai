import type { AIProvider, ReviewCodeInput } from "@/lib/ai/types";
import type { CodeIssue, CodeReviewResult, Severity, SupportedLanguage } from "@/types/review";

/** Deterministic-ish pseudo-random helper so demo results feel varied but stable per code. */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

let mockIssueCounter = 0;
function nextMockIssueId(): string {
  mockIssueCounter += 1;
  return `mock-${Date.now()}-${mockIssueCounter}`;
}

/** 1-indexed line numbers of every line matching `regex`, capped to avoid noise. */
function findLines(lines: string[], regex: RegExp, cap = 5): number[] {
  const hits: number[] = [];
  for (let i = 0; i < lines.length && hits.length < cap; i++) {
    if (regex.test(lines[i])) hits.push(i + 1);
  }
  return hits;
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 22,
  high: 14,
  medium: 8,
  low: 3,
};

/**
 * Lightweight signal extraction the "AI" issues and score computation are
 * based on, so the review actually reflects the submitted code rather than
 * being purely random. This intentionally overlaps a little with the static
 * analysis rules (both are looking at real code, after all) but produces
 * higher-level, narrative findings rather than single-pattern regex hits —
 * and is always tagged `source: "ai"` so the UI/API can tell the two apart.
 */
interface CodeFeatures {
  lineCount: number;
  nonBlankLineCount: number;
  maxIndentDepth: number;
  longestRunOfNonBlankLines: number;
  hasConsoleLogs: boolean;
  consoleLogHits: number[];
  hasEval: boolean;
  evalHits: number[];
  hasVar: boolean;
  varHits: number[];
  hasPrint: boolean;
  printHits: number[];
  hasBareExcept: boolean;
  bareExceptHits: number[];
  hasSelectStar: boolean;
  selectStarHits: number[];
  hasDeleteOrUpdateNoWhere: boolean;
  deleteUpdateNoWhereHits: number[];
  hasTodo: boolean;
  todoHits: number[];
  hasMagicNumbers: boolean;
  magicNumberHits: number[];
  functionCount: number;
}

// `_language` is currently unused here — feature *detection* is language-agnostic
// regex over raw text; language-specific interpretation happens later in
// buildIssues(). Kept as a parameter (not removed) so this stays consistent
// with the rest of the module's per-language function signatures and is
// ready if language-aware detection is added later.
function analyzeFeatures(code: string, _language: SupportedLanguage): CodeFeatures {
  const lines = code.split("\n");

  let maxIndentDepth = 0;
  let longestRun = 0;
  let currentRun = 0;
  for (const line of lines) {
    if (line.trim().length === 0) {
      currentRun = 0;
      continue;
    }
    currentRun += 1;
    longestRun = Math.max(longestRun, currentRun);

    const leading = line.match(/^[ \t]*/)?.[0] ?? "";
    const depth = leading.includes("\t") ? leading.length : Math.floor(leading.length / 2);
    maxIndentDepth = Math.max(maxIndentDepth, depth);
  }

  const consoleLogHits = findLines(lines, /console\.(log|debug|warn)\s*\(/);
  const evalHits = findLines(lines, /\beval\s*\(/);
  const varHits = findLines(lines, /\bvar\s+\w+/);
  const printHits = findLines(lines, /\bprint\s*\(/);
  const bareExceptHits = findLines(lines, /except\s*:\s*$/);
  const selectStarHits = findLines(lines, /select\s+\*/i);
  const deleteUpdateNoWhereHits = findLines(
    lines,
    /^(delete\s+from\s+\w+|update\s+\w+\s+set\s+.+?)\s*;?\s*$/i
  ).filter((lineNo) => !/where/i.test(lines[lineNo - 1]));
  const todoHits = findLines(lines, /\b(TODO|FIXME|XXX)\b/);
  const magicNumberHits = findLines(
    lines,
    /(?<![\w.])(?!0\b|1\b)\d{2,}(?![\w.])/
  );

  const functionCount =
    (code.match(/\bfunction\s+\w+\s*\(/g)?.length ?? 0) +
    (code.match(/\bdef\s+\w+\s*\(/g)?.length ?? 0) +
    (code.match(/=>\s*{/g)?.length ?? 0);

  const nonBlankLineCount = lines.filter((l) => l.trim().length > 0).length;

  return {
    lineCount: lines.length,
    nonBlankLineCount,
    maxIndentDepth,
    longestRunOfNonBlankLines: longestRun,
    hasConsoleLogs: consoleLogHits.length > 0,
    consoleLogHits,
    hasEval: evalHits.length > 0,
    evalHits,
    hasVar: varHits.length > 0,
    varHits,
    hasPrint: printHits.length > 0,
    printHits,
    hasBareExcept: bareExceptHits.length > 0,
    bareExceptHits,
    hasSelectStar: selectStarHits.length > 0,
    selectStarHits,
    hasDeleteOrUpdateNoWhere: deleteUpdateNoWhereHits.length > 0,
    deleteUpdateNoWhereHits,
    hasTodo: todoHits.length > 0,
    todoHits,
    hasMagicNumbers: magicNumberHits.length > 0,
    magicNumberHits,
    functionCount,
  };
}

/**
 * Builds the pool of candidate "AI" findings for this submission. Each
 * candidate is only included when its condition against the actual code
 * holds, so results genuinely reflect what was submitted instead of being a
 * fixed template. A handful of narrative, cross-cutting observations are
 * always eligible as a floor so a very small/clean snippet still gets a
 * reasonably substantive (but honest) review.
 */
function buildIssues(
  features: CodeFeatures,
  lines: string[],
  language: SupportedLanguage,
  seed: number
): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const makeAi = (partial: Omit<CodeIssue, "id" | "source">): CodeIssue => ({
    ...partial,
    id: nextMockIssueId(),
    source: "ai",
  });

  const isJsLike = language === "javascript" || language === "typescript";

  if (isJsLike && features.hasEval) {
    issues.push(
      makeAi({
        severity: "critical",
        category: "security",
        title: "eval() executes arbitrary code",
        description:
          "This snippet calls eval() on a dynamic value. eval() runs whatever string it's given as code, so any attacker-influenced input reaching it becomes a code-injection vector.",
        lineStart: features.evalHits[0],
        lineEnd: features.evalHits[features.evalHits.length - 1],
        whyItMatters:
          "eval() is one of the most common and severe sources of injection vulnerabilities in JavaScript, and it also defeats most static analysis and bundler optimizations.",
        suggestedFix:
          "Replace eval() with a targeted alternative: JSON.parse for data, an explicit parser/interpreter for expressions, or restructure the logic so no string is ever executed as code. This cannot be safely auto-fixed — see the refactored code for a flagged, unmodified reference.",
      })
    );
  }

  if (language === "python") {
    const pyUnsafeExecHits = findLines(lines, /\b(eval|exec)\s*\(/);
    if (pyUnsafeExecHits.length > 0) {
      issues.push(
        makeAi({
          severity: "critical",
          category: "security",
          title: "eval()/exec() executes arbitrary code",
          description:
            "This snippet calls eval() or exec() on a dynamic value. Both run their argument as Python code, so any attacker-influenced input reaching them becomes a code-injection vector.",
          lineStart: pyUnsafeExecHits[0],
          lineEnd: pyUnsafeExecHits[pyUnsafeExecHits.length - 1],
          whyItMatters:
            "eval/exec are classic code-injection vectors and make the code's behavior effectively unauditable when fed untrusted input.",
          suggestedFix:
            "Use ast.literal_eval for parsing trusted literal data, or replace dynamic execution with explicit logic. This cannot be safely auto-fixed — see the refactored code for a flagged, unmodified reference.",
        })
      );
    }
  }

  if (language === "python" && features.hasBareExcept) {
    issues.push(
      makeAi({
        severity: "high",
        category: "bug",
        title: "Bare except hides failure modes",
        description:
          "A bare `except:` clause catches every exception, including KeyboardInterrupt and SystemExit, and silently discards information about what actually went wrong.",
        lineStart: features.bareExceptHits[0],
        lineEnd: features.bareExceptHits[features.bareExceptHits.length - 1],
        whyItMatters:
          "Broad exception handling makes production incidents much harder to diagnose, since the original error and stack trace are lost.",
        suggestedFix:
          "Catch specific exception types you expect (e.g. `except ValueError:`), and re-raise or log unexpected ones instead of silently swallowing them.",
      })
    );
  }

  if (language === "sql" && features.hasDeleteOrUpdateNoWhere) {
    issues.push(
      makeAi({
        severity: "critical",
        category: "bug",
        title: "Unscoped DELETE/UPDATE risks full-table data loss",
        description:
          "A DELETE or UPDATE statement here has no WHERE clause, so it will affect every row in the table when executed.",
        lineStart: features.deleteUpdateNoWhereHits[0],
        lineEnd: features.deleteUpdateNoWhereHits[features.deleteUpdateNoWhereHits.length - 1],
        whyItMatters:
          "Unscoped destructive statements are one of the most common causes of irreversible production data loss.",
        suggestedFix:
          "Add a WHERE clause that scopes the statement to the intended rows, and consider wrapping destructive operations in an explicit transaction with a rollback plan.",
      })
    );
  }

  if (language === "sql" && features.hasSelectStar) {
    issues.push(
      makeAi({
        severity: "low",
        category: "performance",
        title: "SELECT * obscures the query's real data dependencies",
        description:
          "Selecting every column pulls more data than most callers need and silently changes behavior whenever the table schema changes.",
        lineStart: features.selectStarHits[0],
        lineEnd: features.selectStarHits[features.selectStarHits.length - 1],
        whyItMatters:
          "Explicit column lists make the query's intent clear, reduce I/O, and prevent unrelated schema changes from breaking downstream code.",
        suggestedFix: "List only the columns the caller actually consumes.",
      })
    );
  }

  if (isJsLike && features.hasConsoleLogs) {
    issues.push(
      makeAi({
        severity: "low",
        category: "code_quality",
        title: "Debug logging left in shippable code",
        description: `${features.consoleLogHits.length} console.log/debug/warn call(s) look like leftover debugging rather than intentional output.`,
        lineStart: features.consoleLogHits[0],
        lineEnd: features.consoleLogHits[features.consoleLogHits.length - 1],
        whyItMatters:
          "Debug logging shipped to production can leak internal data into browser/server logs and adds noise that hides genuinely important log lines.",
        suggestedFix:
          "Remove debug console calls before merging, or replace them with a logger that respects log levels (so they can stay but be silenced in production).",
      })
    );
  }

  if (features.hasMagicNumbers && features.magicNumberHits.length >= 2) {
    issues.push(
      makeAi({
        severity: "low",
        category: "maintainability",
        title: "Unexplained numeric literals ('magic numbers')",
        description:
          "Several multi-digit numeric literals appear directly in the logic without a named constant explaining what they represent.",
        lineStart: features.magicNumberHits[0],
        lineEnd: features.magicNumberHits[features.magicNumberHits.length - 1],
        whyItMatters:
          "Unnamed constants force readers to reverse-engineer intent, and make it easy to update one occurrence while missing another.",
        suggestedFix:
          "Extract repeated or non-obvious numeric literals into named constants at the top of the file or function.",
      })
    );
  }

  if (features.longestRunOfNonBlankLines >= 25 || features.functionCount <= 1) {
    issues.push(
      makeAi({
        severity: features.longestRunOfNonBlankLines >= 45 ? "medium" : "low",
        category: "maintainability",
        title: "Large block of logic with a single responsibility boundary",
        description: `This submission has a run of ${features.longestRunOfNonBlankLines} consecutive non-blank lines with little structural decomposition, which tends to mix multiple concerns (e.g. parsing, validation, business logic) together.`,
        lineStart: 1,
        lineEnd: Math.min(features.longestRunOfNonBlankLines, features.lineCount),
        whyItMatters:
          "Smaller, single-purpose functions are easier to test in isolation, reuse, and reason about during review.",
        suggestedFix:
          "Identify the distinct steps being performed and extract each into a small, well-named function.",
      })
    );
  }

  if (features.maxIndentDepth >= 4) {
    issues.push(
      makeAi({
        severity: "medium",
        category: "maintainability",
        title: "Deep nesting increases cognitive load",
        description: `Code reaches an indentation depth of roughly ${features.maxIndentDepth} levels in places, which usually signals nested conditionals or loops that could be flattened.`,
        lineStart: 1,
        lineEnd: features.lineCount,
        whyItMatters:
          "Deeply nested logic is harder to trace mentally and more error-prone to modify safely.",
        suggestedFix:
          "Use early returns / guard clauses to reduce nesting, or extract inner blocks into their own functions.",
      })
    );
  }

  // Floor: always include at least one general validation/robustness note so
  // the review still feels substantive on very short or already-clean code.
  if (issues.length < 2) {
    issues.push(
      makeAi({
        severity: "medium",
        category: "bug",
        title: "Inputs are used without explicit validation",
        description:
          "One or more values are used without an explicit check on type, presence, or bounds before use.",
        lineStart: Math.min(3, features.lineCount),
        lineEnd: Math.min(3, features.lineCount),
        whyItMatters:
          "Unvalidated inputs are a common source of runtime crashes and unexpected behavior, especially at API or module boundaries.",
        suggestedFix:
          "Add explicit checks (or a schema validator) near the entry point and fail fast with a clear error.",
      })
    );
  }
  if (issues.length < 3) {
    issues.push(
      makeAi({
        severity: "low",
        category: "code_quality",
        title: "Error handling could be more explicit",
        description:
          "Caught or propagated errors don't consistently distinguish between expected, recoverable conditions and genuine bugs.",
        lineStart: Math.min(5, features.lineCount),
        lineEnd: Math.min(5, features.lineCount),
        whyItMatters:
          "Explicit, typed error handling makes failure modes predictable for callers and easier to test.",
        suggestedFix:
          "Define the specific error conditions this code can hit and handle each deliberately, rather than relying on a catch-all.",
      })
    );
  }

  // Deterministic ordering + a touch of seed-based variety in which "floor"
  // note leads, without affecting whether content-driven issues appear.
  return seed % 2 === 0 ? issues : [...issues].reverse();
}

/** Scores are derived from the actual issues found (weighted by severity), not pure randomness. */
function computeScores(issues: CodeIssue[], features: CodeFeatures, seed: number) {
  const penaltyFor = (category: CodeIssue["category"]) =>
    issues
      .filter((i) => i.category === category)
      .reduce((sum, i) => sum + SEVERITY_WEIGHT[i.severity], 0);

  const jitter = (offset: number) => (seed >> offset) % 6; // 0-5 points of stable variation

  const securityScore = clampScore(92 - penaltyFor("security") - penaltyFor("bug") * 0.4 - jitter(2));
  const performanceScore = clampScore(90 - penaltyFor("performance") - jitter(4));
  const maintainabilityScore = clampScore(
    90 - penaltyFor("maintainability") - (features.maxIndentDepth >= 4 ? 5 : 0) - jitter(6)
  );
  const readabilityScore = clampScore(
    90 - penaltyFor("code_quality") - (features.hasTodo ? 4 : 0) - jitter(8)
  );

  const overallScore = Math.round(
    (securityScore + performanceScore + maintainabilityScore + readabilityScore) / 4
  );

  return {
    overallScore,
    scores: {
      security: securityScore,
      performance: performanceScore,
      maintainability: maintainabilityScore,
      readability: readabilityScore,
    },
  };
}

function clampScore(n: number): number {
  return Math.max(35, Math.min(97, Math.round(n)));
}

/**
 * Applies small, safe, deterministic textual transforms to produce a real
 * refactored sample — never a no-op copy of the input. Every transform is
 * either a mechanical, unambiguous rewrite (stripping debug logging,
 * collapsing blank lines) or an explanatory comment placed next to code we
 * deliberately do NOT claim to have fixed (eval/exec, unscoped SQL writes)
 * since that cannot be done safely without understanding intent. User code
 * is never executed as part of this process.
 */
function buildRefactoredSample(code: string, language: SupportedLanguage): string {
  switch (language) {
    case "javascript":
    case "typescript":
      return refactorJsLike(code);
    case "python":
      return refactorPython(code);
    case "sql":
      return refactorSql(code);
    default:
      return refactorGeneric(code, "//");
  }
}

function collapseBlankLines(code: string): string {
  return code
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, "")) // trim trailing whitespace
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** Renames a small set of very generic identifiers to more descriptive ones, safely (word-boundary, not a property access). */
function renameGenericIdentifiers(code: string, map: Record<string, string>): {
  code: string;
  renamed: string[];
} {
  let output = code;
  const renamed: string[] = [];
  for (const [from, to] of Object.entries(map)) {
    const pattern = new RegExp(`(?<![.\\w])\\b${from}\\b(?!\\s*:)`, "g");
    if (pattern.test(output)) {
      output = output.replace(pattern, to);
      renamed.push(`${from} → ${to}`);
    }
  }
  return { code: output, renamed };
}

function refactorJsLike(code: string): string {
  const notes: string[] = [];
  let lines = code.split("\n");

  // 1. Remove standalone console.log/debug/warn statements.
  const beforeCount = lines.length;
  lines = lines.filter((line) => !/^\s*console\.(log|debug|warn)\s*\([^;]*\)\s*;?\s*$/.test(line));
  const removedConsoleCount = beforeCount - lines.length;
  if (removedConsoleCount > 0) {
    notes.push(`Removed ${removedConsoleCount} leftover console.log/debug/warn statement(s).`);
  }

  let working = lines.join("\n");

  // 2. eval() cannot be safely auto-fixed — flag it instead of pretending to fix it.
  if (/\beval\s*\(/.test(working)) {
    working = working.replace(
      /^(\s*)(.*\beval\s*\([^\n]*)$/gm,
      (_m, indent: string, rest: string) =>
        `${indent}// TODO(CodeSage): eval() was left unchanged — this cannot be safely auto-fixed. Replace with JSON.parse, an explicit parser, or restructure to avoid executing dynamic strings.\n${indent}${rest}`
    );
    notes.push("Flagged eval() usage with a review comment instead of silently rewriting it.");
  }

  // 3. Promote var -> let for simple declarations (safe, mechanical rename of the keyword only).
  if (/\bvar\s+\w/.test(working)) {
    const varCount = (working.match(/\bvar\s+\w/g) || []).length;
    working = working.replace(/\bvar(\s+\w)/g, "let$1");
    notes.push(`Converted ${varCount} 'var' declaration(s) to 'let' for block scoping.`);
  }

  // 4. Rename a small set of obviously generic identifiers.
  const { code: renamedCode, renamed } = renameGenericIdentifiers(working, {
    data: "parsedData",
    temp: "intermediateValue",
    tmp: "intermediateValue",
    foo: "value",
  });
  working = renamedCode;
  if (renamed.length > 0) {
    notes.push(`Improved variable naming: ${renamed.join(", ")}.`);
  }

  working = collapseBlankLines(working);

  return finalizeRefactor(working, notes, "//");
}

function refactorPython(code: string): string {
  const notes: string[] = [];
  let working = code;

  // Rename identifiers BEFORE inserting any explanatory comments below, so
  // the renamer only ever touches the user's original code — never text we
  // add ourselves (which could otherwise contain a word like "data").
  const { code: renamedCode, renamed } = renameGenericIdentifiers(working, {
    data: "parsed_data",
    temp: "intermediate_value",
    tmp: "intermediate_value",
    foo: "value",
  });
  working = renamedCode;
  if (renamed.length > 0) {
    notes.push(`Improved variable naming: ${renamed.join(", ")}.`);
  }

  if (/\b(eval|exec)\s*\(/.test(working)) {
    working = working.replace(
      /^([ \t]*)(.*\b(?:eval|exec)\s*\([^\n]*)$/gm,
      (_m, indent: string, rest: string) =>
        `${indent}# TODO(CodeSage): eval()/exec() left unchanged — cannot be safely auto-fixed. Prefer ast.literal_eval for parsing trusted literal values, or restructure to avoid executing dynamic strings.\n${indent}${rest}`
    );
    notes.push("Flagged eval()/exec() usage with a review comment instead of silently rewriting it.");
  }

  if (/except\s*:\s*$/m.test(working)) {
    working = working.replace(
      /^([ \t]*)except\s*:\s*$/gm,
      (_m, indent: string) =>
        `${indent}# TODO(CodeSage): bare except left unchanged — catch a specific exception type instead.\n${indent}except Exception:`
    );
    notes.push("Flagged bare except clause(s) — narrowed to `except Exception:` as a safer minimum, review further.");
  }

  working = collapseBlankLines(working);

  return finalizeRefactor(working, notes, "#");
}

function refactorSql(code: string): string {
  const notes: string[] = [];
  let working = code;

  if (/select\s+\*/i.test(working)) {
    const count = (working.match(/select\s+\*/gi) || []).length;
    working = working.replace(
      /select\s+\*/gi,
      "SELECT /* TODO(CodeSage): replace * with an explicit column list */ *"
    );
    notes.push(`Marked ${count} SELECT * usage(s) for explicit column lists.`);
  }

  const lines = working.split("\n");
  const flagged: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const isWrite = /^\s*(delete\s+from\s+\w+|update\s+\w+\s+set\s+.+?)\s*;?\s*$/i.test(lines[i]);
    if (isWrite && !/where/i.test(lines[i])) {
      const indentMatch = lines[i].match(/^\s*/);
      const indent = indentMatch ? indentMatch[0] : "";
      lines[i] = `${indent}-- WARNING(CodeSage): this statement has no WHERE clause and will affect every row. Add a WHERE clause before running it.\n${lines[i]}`;
      flagged.push(String(i + 1));
    }
  }
  if (flagged.length > 0) {
    working = lines.join("\n");
    notes.push(`Flagged ${flagged.length} unscoped DELETE/UPDATE statement(s) — not modified, since a safe scope can't be inferred automatically.`);
  }

  working = collapseBlankLines(working);

  return finalizeRefactor(working, notes, "--");
}

function refactorGeneric(code: string, commentPrefix: string): string {
  const notes: string[] = [];
  const working = collapseBlankLines(code);
  if (working !== code) {
    notes.push("Trimmed trailing whitespace and collapsed extra blank lines.");
  }
  return finalizeRefactor(working, notes, commentPrefix);
}

function finalizeRefactor(code: string, notes: string[], commentPrefix: string): string {
  const header =
    notes.length > 0
      ? [
          `${commentPrefix} Refactored by CodeSage AI (Demo/Mock Mode) — automatic, deterministic changes only:`,
          ...notes.map((n) => `${commentPrefix} - ${n}`),
          `${commentPrefix} Issues that can't be safely auto-fixed are flagged inline above, not silently rewritten.`,
          "",
        ].join("\n")
      : [
          `${commentPrefix} CodeSage AI (Demo/Mock Mode): no automatic, safe transform applied to this snippet.`,
          `${commentPrefix} Review the issues list above — most findings here need human judgment to fix correctly.`,
          "",
        ].join("\n");

  return header + code;
}

/**
 * MockAIProvider generates realistic, structurally-valid review results without
 * calling any external API. This lets the entire application be demoed and
 * developed with zero cost and no API key. The UI clearly labels reviews
 * produced in this mode as "Demo Mode". User-submitted code is never
 * executed — all analysis here is static (regex/heuristic) inspection.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async reviewCode({ code, language }: ReviewCodeInput): Promise<CodeReviewResult> {
    // Simulate realistic network latency so loading states are demonstrable.
    await new Promise((resolve) => setTimeout(resolve, 900 + Math.random() * 700));

    const lines = code.split("\n");
    const seed = hashString(code + language);
    const features = analyzeFeatures(code, language);

    const issues = buildIssues(features, lines, language, seed);
    const { overallScore, scores } = computeScores(issues, features, seed);

    const strengthPool = [
      "Code is organized into clearly named functions with a consistent style.",
      "Core logic is easy to follow at a glance.",
      "Variable names are descriptive and consistent.",
      "The overall structure separates concerns reasonably well.",
      "Control flow avoids unnecessary nesting in most places.",
    ];
    const strengths = [
      strengthPool[seed % strengthPool.length],
      strengthPool[(seed + 1) % strengthPool.length],
    ].filter((s, i, arr) => arr.indexOf(s) === i);
    if (strengths.length < 2) strengths.push(strengthPool[(seed + 2) % strengthPool.length]);

    const refactoredCode = buildRefactoredSample(code, language);

    const topIssue = [...issues].sort(
      (a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]
    )[0];

    const summary = `This ${features.lineCount}-line ${language} snippet is functional but has ${issues.length} notable issue(s) spanning ${Array.from(
      new Set(issues.map((i) => i.category.replace("_", " ")))
    ).join(", ")}. Overall code quality is ${
      overallScore >= 80 ? "solid" : overallScore >= 60 ? "reasonable" : "in need of attention"
    }, with the most pressing concern being ${topIssue.title.toLowerCase()}.`;

    const finalRecommendation =
      overallScore >= 80
        ? "This code is in good shape. Address the flagged medium/low severity items opportunistically and consider adding tests around the edge cases identified above."
        : overallScore >= 60
        ? "Address the critical and high severity issues before merging. The remaining items can be tracked as follow-up improvements."
        : "This code needs meaningful rework before it's production-ready — prioritize the security and correctness issues first.";

    return {
      summary,
      overallScore,
      scores,
      issues,
      strengths,
      refactoredCode,
      finalRecommendation,
    };
  }
}
