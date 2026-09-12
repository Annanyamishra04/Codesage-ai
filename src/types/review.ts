export type Severity = "critical" | "high" | "medium" | "low";

export type IssueCategory =
  | "bug"
  | "security"
  | "performance"
  | "code_quality"
  | "maintainability";

export type IssueSource = "ai" | "static_analysis";

export interface CodeIssue {
  id: string;
  severity: Severity;
  category: IssueCategory;
  title: string;
  description: string;
  lineStart: number | null;
  lineEnd: number | null;
  whyItMatters: string;
  suggestedFix: string;
  /** Distinguishes AI-detected findings from lightweight static-analysis findings. */
  source: IssueSource;
}

export interface CodeReviewScores {
  security: number;
  performance: number;
  maintainability: number;
  readability: number;
}

export interface CodeReviewResult {
  summary: string;
  overallScore: number;
  scores: CodeReviewScores;
  issues: CodeIssue[];
  strengths: string[];
  refactoredCode: string;
  finalRecommendation: string;
}

export const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "cpp",
  "go",
  "sql",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  go: "Go",
  sql: "SQL",
};

/** Maps our language ids to Monaco editor language ids. */
export const MONACO_LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  cpp: "cpp",
  go: "go",
  sql: "sql",
};

export interface ReviewListItem {
  id: string;
  language: string;
  overallScore: number;
  issueCount: number;
  summary: string;
  createdAt: string;
}

export interface ReviewDetail extends CodeReviewResult {
  id: string;
  language: string;
  originalCode: string;
  aiProvider: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
