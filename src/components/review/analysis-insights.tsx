import { Lightbulb, TrendingUp, TrendingDown, AlarmClock, ListChecks } from "lucide-react";
import type { CodeIssue, CodeReviewScores, Severity } from "@/types/review";

const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};
const CATEGORY_LABEL: Record<string, string> = {
  bug: "Bugs",
  security: "Security",
  performance: "Performance",
  code_quality: "Code Quality",
  maintainability: "Maintainability",
};
const SCORE_DIMENSION_LABEL: Record<keyof CodeReviewScores, string> = {
  security: "Security",
  performance: "Performance",
  maintainability: "Maintainability",
  readability: "Readability",
};

interface Insight {
  icon: typeof Lightbulb;
  label: string;
  value: string;
}

/**
 * Derives a handful of at-a-glance insights purely from the issues/scores
 * already returned for this review — no separate analytics pipeline, no
 * fabricated numbers.
 */
function computeInsights(issues: CodeIssue[], scores: CodeReviewScores): Insight[] {
  const insights: Insight[] = [];

  insights.push({
    icon: ListChecks,
    label: "Issues found",
    value: String(issues.length),
  });

  if (issues.length > 0) {
    const categoryCounts = new Map<string, number>();
    for (const issue of issues) {
      categoryCounts.set(issue.category, (categoryCounts.get(issue.category) ?? 0) + 1);
    }
    const [topCategory, topCount] = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    insights.push({
      icon: Lightbulb,
      label: "Most common issue type",
      value: `${CATEGORY_LABEL[topCategory] ?? topCategory} (${topCount})`,
    });

    const highestSeverity = issues.reduce<Severity>((worst, issue) =>
      SEVERITY_RANK[issue.severity] > SEVERITY_RANK[worst] ? issue.severity : worst
    , issues[0].severity);
    insights.push({
      icon: AlarmClock,
      label: "Highest severity detected",
      value: SEVERITY_LABEL[highestSeverity],
    });
  }

  const dimensionEntries = Object.entries(scores) as [keyof CodeReviewScores, number][];
  const strongest = dimensionEntries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const weakest = dimensionEntries.reduce((a, b) => (b[1] < a[1] ? b : a));

  insights.push({
    icon: TrendingUp,
    label: "Strongest area",
    value: `${SCORE_DIMENSION_LABEL[strongest[0]]} (${strongest[1]})`,
  });
  insights.push({
    icon: TrendingDown,
    label: "Needs the most improvement",
    value: `${SCORE_DIMENSION_LABEL[weakest[0]]} (${weakest[1]})`,
  });

  return insights;
}

export function AnalysisInsights({
  issues,
  scores,
}: {
  issues: CodeIssue[];
  scores: CodeReviewScores;
}) {
  const insights = computeInsights(issues, scores);

  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="mb-3 text-sm font-semibold">Analysis Insights</h4>
      <dl className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight) => (
          <div key={insight.label} className="flex items-start gap-2.5">
            <insight.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">{insight.label}</dt>
              <dd className="truncate text-sm font-medium">{insight.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
