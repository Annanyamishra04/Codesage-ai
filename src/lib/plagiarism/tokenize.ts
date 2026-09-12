/**
 * Language-aware code normalization + tokenization for the plagiarism /
 * code-similarity engine.
 *
 * This intentionally does NOT parse a real AST — that would pull in a
 * separate parser per language (heavy, and still wouldn't cover every
 * language we support). Instead it uses a small hand-written state machine
 * to strip comments (without disturbing string contents or line numbers)
 * and a regex-based tokenizer, which is enough to normalize away
 * formatting/whitespace/comment differences while staying dependency-free
 * and fast enough for free-tier serverless functions.
 */

export interface CodeToken {
  value: string;
  /** 1-based line number in the ORIGINAL source, preserved through comment stripping. */
  line: number;
}

interface CommentSyntax {
  lineComment?: string;
  blockComment?: { start: string; end: string };
  /** Single-character string delimiters (e.g. `"`, `'`, `` ` ``). */
  stringChars: string[];
  /** Whether triple-quoted strings (`'''`/`"""`) should be treated as one string token (Python). */
  tripleQuotedStrings?: boolean;
}

const SYNTAX_BY_LANGUAGE: Record<string, CommentSyntax> = {
  javascript: { lineComment: "//", blockComment: { start: "/*", end: "*/" }, stringChars: ['"', "'", "`"] },
  typescript: { lineComment: "//", blockComment: { start: "/*", end: "*/" }, stringChars: ['"', "'", "`"] },
  java: { lineComment: "//", blockComment: { start: "/*", end: "*/" }, stringChars: ['"', "'"] },
  cpp: { lineComment: "//", blockComment: { start: "/*", end: "*/" }, stringChars: ['"', "'"] },
  go: { lineComment: "//", blockComment: { start: "/*", end: "*/" }, stringChars: ['"', "'", "`"] },
  sql: { lineComment: "--", blockComment: { start: "/*", end: "*/" }, stringChars: ["'"] },
  python: { lineComment: "#", stringChars: ['"', "'"], tripleQuotedStrings: true },
};

const DEFAULT_SYNTAX: CommentSyntax = {
  lineComment: "//",
  blockComment: { start: "/*", end: "*/" },
  stringChars: ['"', "'"],
};

/**
 * Replaces every comment character with a space while leaving newlines,
 * string contents, and all other code untouched — so line numbers computed
 * afterwards still line up with the original source, and stripping never
 * accidentally eats a `//` that appears inside a string literal.
 */
export function stripComments(code: string, language: string): string {
  const syntax = SYNTAX_BY_LANGUAGE[language] ?? DEFAULT_SYNTAX;
  const out: string[] = [];
  let i = 0;
  const n = code.length;

  const matchesAt = (str: string, pos: number) =>
    str.length > 0 && code.startsWith(str, pos);

  while (i < n) {
    const ch = code[i];

    // Triple-quoted strings (Python docstrings) — copy through verbatim.
    if (syntax.tripleQuotedStrings && (ch === '"' || ch === "'") && matchesAt(ch.repeat(3), i)) {
      const delim = ch.repeat(3);
      out.push(delim);
      i += 3;
      while (i < n && !matchesAt(delim, i)) {
        out.push(code[i]);
        i += 1;
      }
      if (i < n) {
        out.push(delim);
        i += 3;
      }
      continue;
    }

    // Single-line comment.
    if (syntax.lineComment && matchesAt(syntax.lineComment, i)) {
      while (i < n && code[i] !== "\n") {
        out.push(" ");
        i += 1;
      }
      continue;
    }

    // Block comment.
    if (syntax.blockComment && matchesAt(syntax.blockComment.start, i)) {
      while (i < n && !matchesAt(syntax.blockComment.end, i)) {
        out.push(code[i] === "\n" ? "\n" : " ");
        i += 1;
      }
      if (i < n) {
        out.push("  "); // the closing delimiter itself
        i += syntax.blockComment.end.length;
      }
      continue;
    }

    // String literal — copy through verbatim (including any escapes).
    if (syntax.stringChars.includes(ch)) {
      out.push(ch);
      i += 1;
      while (i < n && code[i] !== ch) {
        if (code[i] === "\\" && i + 1 < n) {
          out.push(code[i], code[i + 1]);
          i += 2;
          continue;
        }
        out.push(code[i]);
        i += 1;
      }
      if (i < n) {
        out.push(code[i]);
        i += 1;
      }
      continue;
    }

    out.push(ch);
    i += 1;
  }

  return out.join("");
}

const TOKEN_REGEX =
  /[A-Za-z_][A-Za-z0-9_]*|\d+\.\d+|\d+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|==|!=|<=|>=|&&|\|\||=>|->|\+\+|--|[^\sA-Za-z0-9_]/g;

/** Tokenizes already comment-stripped source into (value, line) pairs. */
export function tokenize(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let line = 1;
  let cursor = 0;
  let match: RegExpExecArray | null;
  TOKEN_REGEX.lastIndex = 0;

  while ((match = TOKEN_REGEX.exec(code)) !== null) {
    // Count newlines between the previous cursor and this match to keep
    // line numbers accurate without re-scanning from the start each time.
    for (let idx = cursor; idx < match.index; idx += 1) {
      if (code[idx] === "\n") line += 1;
    }
    cursor = match.index;
    tokens.push({ value: match[0], line });
    cursor = TOKEN_REGEX.lastIndex;
  }

  return tokens;
}

const KEYWORDS_BY_LANGUAGE: Record<string, Set<string>> = {
  javascript: new Set(
    "break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield async await static get set of null true false undefined this".split(" ")
  ),
  typescript: new Set(
    "break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield async await static get set of null true false undefined interface type enum implements private public protected readonly namespace declare as satisfies keyof infer".split(" ")
  ),
  python: new Set(
    "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield self".split(" ")
  ),
  java: new Set(
    "abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null var".split(" ")
  ),
  cpp: new Set(
    "alignas alignof and and_eq asm auto bitand bitor bool break case catch char char8_t char16_t char32_t class compl concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq private protected public register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor xor_eq".split(" ")
  ),
  go: new Set(
    "break default func interface select case defer go map struct chan else goto package switch const fallthrough if range type continue for import return var true false nil".split(" ")
  ),
  sql: new Set(
    "select from where join left right inner outer on group by order having limit offset insert into values update set delete create table alter drop index view as and or not null is in exists between like distinct union all case when then else end asc desc primary key foreign references default count sum avg min max".split(" ")
  ),
};

/** True when `value` is a language keyword (case-insensitive; SQL keywords are commonly typed in any case). */
export function isKeyword(value: string, language: string): boolean {
  const keywords = KEYWORDS_BY_LANGUAGE[language];
  if (!keywords) return false;
  return keywords.has(value) || keywords.has(value.toLowerCase());
}

/**
 * Collapses a raw token to an abstract category token (identifiers -> ID,
 * numbers -> NUM, strings -> STR) while leaving keywords and punctuation
 * untouched. This is what lets the engine catch a copy that only renamed
 * variables/functions and changed literal values.
 */
export function normalizeToken(value: string, language: string): string {
  if (/^\d/.test(value)) return "NUM";
  if (/^["'`]/.test(value)) return "STR";
  if (/^[A-Za-z_]/.test(value)) {
    return isKeyword(value, language) ? value.toLowerCase() : "ID";
  }
  return value;
}
