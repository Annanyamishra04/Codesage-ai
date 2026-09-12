import type { CodeIssue, SupportedLanguage } from "@/types/review";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `static-${Date.now()}-${idCounter}`;
}

function makeIssue(partial: Omit<CodeIssue, "id" | "source">): CodeIssue {
  return { ...partial, id: nextId(), source: "static_analysis" };
}

/** Finds 1-indexed line numbers matching a regex, capped to avoid noise spam. */
function findLines(lines: string[], regex: RegExp, cap = 5): number[] {
  const hits: number[] = [];
  for (let i = 0; i < lines.length && hits.length < cap; i++) {
    if (regex.test(lines[i])) hits.push(i + 1);
  }
  return hits;
}

const SECRET_PATTERN =
  /(api[_-]?key|secret|password|passwd|token|access[_-]?key)\s*[:=]\s*["'][^"'\s]{6,}["']/i;

function checkHardcodedSecrets(lines: string[]): CodeIssue[] {
  const hits = findLines(lines, SECRET_PATTERN);
  if (hits.length === 0) return [];
  return [
    makeIssue({
      severity: "critical",
      category: "security",
      title: "Possible hardcoded secret",
      description:
        "A string literal matching a common secret/credential pattern was found in the source.",
      lineStart: hits[0],
      lineEnd: hits[hits.length - 1],
      whyItMatters:
        "Hardcoded credentials can leak through version control or build artifacts and are difficult to rotate safely.",
      suggestedFix:
        "Move secrets to environment variables or a secrets manager, and remove them from source control history if already committed.",
    }),
  ];
}

function checkLongLines(lines: string[], limit = 140): CodeIssue[] {
  const hits = findLines(lines, new RegExp(`^.{${limit},}$`));
  if (hits.length === 0) return [];
  return [
    makeIssue({
      severity: "low",
      category: "code_quality",
      title: "Excessively long lines",
      description: `${hits.length} line(s) exceed ${limit} characters, which hurts readability.`,
      lineStart: hits[0],
      lineEnd: hits[hits.length - 1],
      whyItMatters:
        "Very long lines are harder to review in diffs and often signal that logic should be broken into smaller expressions.",
      suggestedFix: "Wrap or refactor long lines into smaller, well-named statements.",
    }),
  ];
}

function jsAndTsRules(lines: string[]): CodeIssue[] {
  const issues: CodeIssue[] = [];

  const consoleHits = findLines(lines, /console\.(log|debug|warn)\s*\(/);
  if (consoleHits.length > 0) {
    issues.push(
      makeIssue({
        severity: "low",
        category: "code_quality",
        title: "console statements left in code",
        description: `Found ${consoleHits.length} console.log/debug/warn call(s).`,
        lineStart: consoleHits[0],
        lineEnd: consoleHits[consoleHits.length - 1],
        whyItMatters:
          "Debug logging left in production code can leak information and clutter output.",
        suggestedFix: "Remove debug console calls or replace with a proper logger that respects log levels.",
      })
    );
  }

  const evalHits = findLines(lines, /\beval\s*\(/);
  if (evalHits.length > 0) {
    issues.push(
      makeIssue({
        severity: "critical",
        category: "security",
        title: "Use of eval()",
        description: "eval() executes arbitrary strings as code.",
        lineStart: evalHits[0],
        lineEnd: evalHits[evalHits.length - 1],
        whyItMatters:
          "eval() is a common vector for code injection and makes static analysis / bundling unreliable.",
        suggestedFix: "Avoid eval(); use JSON.parse, Function constructors with strict input control, or refactor the logic entirely.",
      })
    );
  }

  const doubleEqHits = findLines(lines, /[^=!]==[^=]/);
  if (doubleEqHits.length > 0) {
    issues.push(
      makeIssue({
        severity: "medium",
        category: "bug",
        title: "Loose equality (==) used",
        description: "Loose equality triggers implicit type coercion, which can hide bugs.",
        lineStart: doubleEqHits[0],
        lineEnd: doubleEqHits[doubleEqHits.length - 1],
        whyItMatters: "Coercive comparisons (e.g. '' == 0) can produce surprising, hard-to-debug behavior.",
        suggestedFix: "Use strict equality (=== / !==) unless loose equality is explicitly intended.",
      })
    );
  }

  const varHits = findLines(lines, /\bvar\s+\w+/);
  if (varHits.length > 0) {
    issues.push(
      makeIssue({
        severity: "low",
        category: "maintainability",
        title: "Legacy 'var' declarations",
        description: "'var' has function scope and hoisting semantics that often cause confusion.",
        lineStart: varHits[0],
        lineEnd: varHits[varHits.length - 1],
        whyItMatters: "let/const provide block scoping and clearer intent, reducing accidental reassignment bugs.",
        suggestedFix: "Replace var with let or const as appropriate.",
      })
    );
  }

  issues.push(...checkHardcodedSecrets(lines));
  issues.push(...checkLongLines(lines));

  return issues;
}

function pythonRules(lines: string[]): CodeIssue[] {
  const issues: CodeIssue[] = [];

  const printHits = findLines(lines, /\bprint\s*\(/);
  if (printHits.length > 0) {
    issues.push(
      makeIssue({
        severity: "low",
        category: "code_quality",
        title: "print() statements left in code",
        description: `Found ${printHits.length} print() call(s), likely leftover debugging.`,
        lineStart: printHits[0],
        lineEnd: printHits[printHits.length - 1],
        whyItMatters: "Print debugging clutters output and offers no log-level control in production.",
        suggestedFix: "Use the `logging` module with appropriate log levels instead of print().",
      })
    );
  }

  const evalExecHits = findLines(lines, /\b(eval|exec)\s*\(/);
  if (evalExecHits.length > 0) {
    issues.push(
      makeIssue({
        severity: "critical",
        category: "security",
        title: "Use of eval()/exec()",
        description: "eval/exec execute arbitrary code strings.",
        lineStart: evalExecHits[0],
        lineEnd: evalExecHits[evalExecHits.length - 1],
        whyItMatters: "These functions are classic code-injection vectors when fed untrusted input.",
        suggestedFix: "Avoid eval/exec; use safer alternatives such as ast.literal_eval for data parsing.",
      })
    );
  }

  const bareExceptHits = findLines(lines, /except\s*:\s*$/);
  if (bareExceptHits.length > 0) {
    issues.push(
      makeIssue({
        severity: "medium",
        category: "bug",
        title: "Bare except clause",
        description: "A bare `except:` swallows all exceptions, including KeyboardInterrupt and SystemExit.",
        lineStart: bareExceptHits[0],
        lineEnd: bareExceptHits[bareExceptHits.length - 1],
        whyItMatters: "Silently catching every exception hides real bugs and makes debugging much harder.",
        suggestedFix: "Catch specific exception types (e.g. `except ValueError:`).",
      })
    );
  }

  issues.push(...checkHardcodedSecrets(lines));
  issues.push(...checkLongLines(lines));

  return issues;
}

function sqlRules(lines: string[]): CodeIssue[] {
  const issues: CodeIssue[] = [];

  const selectStarHits = findLines(lines, /select\s+\*/i);
  if (selectStarHits.length > 0) {
    issues.push(
      makeIssue({
        severity: "low",
        category: "performance",
        title: "SELECT * usage",
        description: "Selecting all columns can pull unnecessary data and breaks when the schema changes.",
        lineStart: selectStarHits[0],
        lineEnd: selectStarHits[selectStarHits.length - 1],
        whyItMatters: "Wide selects increase I/O and network transfer, and hide the query's real data dependencies.",
        suggestedFix: "Explicitly list only the columns you need.",
      })
    );
  }

  const deleteNoWhereHits = findLines(
    lines,
    /delete\s+from\s+\w+\s*;?\s*$/i
  );
  if (deleteNoWhereHits.length > 0) {
    issues.push(
      makeIssue({
        severity: "critical",
        category: "bug",
        title: "DELETE without WHERE clause",
        description: "A DELETE statement with no WHERE clause removes every row in the table.",
        lineStart: deleteNoWhereHits[0],
        lineEnd: deleteNoWhereHits[deleteNoWhereHits.length - 1],
        whyItMatters: "This is one of the most common causes of catastrophic, irreversible data loss.",
        suggestedFix: "Add a WHERE clause scoping the delete, and consider wrapping destructive statements in a transaction.",
      })
    );
  }

  const concatHits = findLines(lines, /["']\s*\+\s*\w+.*(select|insert|update|delete)/i);
  if (concatHits.length > 0) {
    issues.push(
      makeIssue({
        severity: "high",
        category: "security",
        title: "Possible SQL built via string concatenation",
        description: "Query text appears to be built by concatenating variables into SQL.",
        lineStart: concatHits[0],
        lineEnd: concatHits[concatHits.length - 1],
        whyItMatters: "String-concatenated SQL is a leading cause of SQL injection vulnerabilities.",
        suggestedFix: "Use parameterized queries or prepared statements instead of string concatenation.",
      })
    );
  }

  issues.push(...checkLongLines(lines));

  return issues;
}

function genericRules(lines: string[]): CodeIssue[] {
  // Applies to Java, C++, Go, and anything without dedicated rules above.
  const issues: CodeIssue[] = [];
  issues.push(...checkHardcodedSecrets(lines));
  issues.push(...checkLongLines(lines));

  const todoHits = findLines(lines, /\b(TODO|FIXME|XXX)\b/);
  if (todoHits.length > 0) {
    issues.push(
      makeIssue({
        severity: "low",
        category: "maintainability",
        title: "Unresolved TODO/FIXME markers",
        description: `Found ${todoHits.length} TODO/FIXME comment(s).`,
        lineStart: todoHits[0],
        lineEnd: todoHits[todoHits.length - 1],
        whyItMatters: "Unresolved markers often indicate incomplete or fragile logic shipped to production.",
        suggestedFix: "Resolve the TODO or file a tracked ticket referencing it.",
      })
    );
  }

  return issues;
}

/**
 * Runs a small, dependency-free static analysis pass over the given source.
 * These checks are intentionally simple regex heuristics — they run instantly,
 * cost nothing, and complement (never replace) the AI review.
 */
export function runStaticAnalysis(
  code: string,
  language: SupportedLanguage
): CodeIssue[] {
  const lines = code.split("\n");

  switch (language) {
    case "javascript":
    case "typescript":
      return jsAndTsRules(lines);
    case "python":
      return pythonRules(lines);
    case "sql":
      return sqlRules(lines);
    case "java":
    case "cpp":
    case "go":
      return genericRules(lines);
    default:
      return genericRules(lines);
  }
}
