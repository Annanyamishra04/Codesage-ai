import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CodeIssue, Severity } from "@/types/review";
import {
  Bug,
  ShieldAlert,
  Gauge,
  Brush,
  Wrench,
  MapPin,
  Cpu,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_BADGE: Record<Severity, "critical" | "high" | "medium" | "low"> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

const CATEGORY_ICON = {
  bug: Bug,
  security: ShieldAlert,
  performance: Gauge,
  code_quality: Brush,
  maintainability: Wrench,
} as const;

const CATEGORY_LABEL: Record<string, string> = {
  bug: "Bug",
  security: "Security",
  performance: "Performance",
  code_quality: "Code Quality",
  maintainability: "Maintainability",
};

export function IssueCard({
  issue,
  onLineClick,
}: {
  issue: CodeIssue;
  /** Called when the user clicks the line badge; parent decides how/where to jump and highlight. */
  onLineClick?: (lineStart: number, lineEnd: number | null) => void;
}) {
  const Icon = CATEGORY_ICON[issue.category] ?? Bug;

  return (
    <Card className="animate-fade-in">
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                issue.severity === "critical" && "bg-destructive/10 text-destructive",
                issue.severity === "high" && "bg-orange-500/10 text-orange-500",
                issue.severity === "medium" && "bg-warning/10 text-warning",
                issue.severity === "low" && "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium leading-tight">{issue.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant={SEVERITY_BADGE[issue.severity]}>
                  {issue.severity}
                </Badge>
                <Badge variant="secondary">{CATEGORY_LABEL[issue.category]}</Badge>
                {issue.source === "static_analysis" ? (
                  <Badge variant="outline" className="gap-1">
                    <Cpu className="h-3 w-3" /> Static analysis
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" /> AI
                  </Badge>
                )}
                {issue.lineStart != null && (
                  onLineClick ? (
                    <button
                      type="button"
                      onClick={() => onLineClick(issue.lineStart as number, issue.lineEnd)}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                      title="Jump to this line in the comparison view"
                    >
                      <MapPin className="h-3 w-3" />
                      Line {issue.lineStart}
                      {issue.lineEnd && issue.lineEnd !== issue.lineStart ? `–${issue.lineEnd}` : ""}
                    </button>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      Line {issue.lineStart}
                      {issue.lineEnd && issue.lineEnd !== issue.lineStart ? `–${issue.lineEnd}` : ""}
                    </Badge>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{issue.description}</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-muted/50 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Why it matters
            </p>
            <p className="text-sm">{issue.whyItMatters}</p>
          </div>
          <div className="rounded-md bg-primary/5 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Suggested fix
            </p>
            <p className="text-sm">{issue.suggestedFix}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
