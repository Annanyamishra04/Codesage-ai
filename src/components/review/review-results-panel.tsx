"use client";

import { useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressRing } from "@/components/ui/progress-ring";
import { BarScore } from "@/components/ui/bar-score";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IssueCard } from "@/components/review/issue-card";
import { CodeDiffPanel, type CodeDiffPanelHandle } from "@/components/review/code-diff-panel";
import { AnalysisInsights } from "@/components/review/analysis-insights";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type {
  CodeReviewResult,
  IssueCategory,
  IssueSource,
  Severity,
  SupportedLanguage,
} from "@/types/review";
import { CheckCircle2, FlaskConical, X } from "lucide-react";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  bug: "Bug",
  security: "Security",
  performance: "Performance",
  code_quality: "Code Quality",
  maintainability: "Maintainability",
};

const SOURCE_LABEL: Record<IssueSource, string> = {
  ai: "AI Analysis",
  static_analysis: "Static Analysis",
};

export function ReviewResultsPanel({
  result,
  originalCode,
  language,
  demoMode,
}: {
  result: CodeReviewResult;
  originalCode: string;
  language: SupportedLanguage;
  demoMode: boolean;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<IssueSource | "all">("all");
  const diffPanelRef = useRef<CodeDiffPanelHandle | null>(null);

  const presentCategories = useMemo(() => {
    const set = new Set<IssueCategory>();
    for (const issue of result.issues) set.add(issue.category);
    return [...set];
  }, [result.issues]);

  const sortedIssues = useMemo(() => {
    const filtered = result.issues.filter((i) => {
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
      if (sourceFilter !== "all" && i.source !== sourceFilter) return false;
      return true;
    });
    return [...filtered].sort(
      (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
    );
  }, [result.issues, severityFilter, categoryFilter, sourceFilter]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const issue of result.issues) c[issue.severity]++;
    return c;
  }, [result.issues]);

  const filtersActive = severityFilter !== "all" || categoryFilter !== "all" || sourceFilter !== "all";

  const clearFilters = () => {
    setSeverityFilter("all");
    setCategoryFilter("all");
    setSourceFilter("all");
  };

  const handleIssueLineClick = (lineStart: number, lineEnd: number | null) => {
    setActiveTab("refactor");
    // The "refactor" tab (and its Monaco editors) mounts lazily, so the ref
    // may not exist on the very next tick yet. Poll briefly instead of a
    // single fixed delay — CodeDiffPanel itself queues the request further
    // if Monaco is still loading, so this only needs to bridge the gap until
    // the panel component exists in the tree.
    let attempts = 0;
    const tryHighlight = () => {
      if (diffPanelRef.current) {
        diffPanelRef.current.highlightOriginalLine(lineStart, lineEnd);
        return;
      }
      attempts += 1;
      if (attempts < 20) window.setTimeout(tryHighlight, 50);
    };
    window.setTimeout(tryHighlight, 30);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto thin-scrollbar">
      {demoMode && (
        <div className="flex items-start gap-2 border-b border-border bg-warning/10 px-4 py-2.5 text-xs text-warning">
          <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-medium">Demo Mode.</span> Uses deterministic static analysis and
            simulated AI review results — no API key is configured. The full workflow below reflects
            what a real review looks like.
          </span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col p-4">
        <TabsList className="self-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">Issues ({result.issues.length})</TabsTrigger>
          <TabsTrigger value="refactor">Improved Code</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 space-y-6">
          <div className="flex flex-col items-center gap-6 rounded-lg border border-border p-6 sm:flex-row">
            <ProgressRing score={result.overallScore} label="/ 100" size={140} />
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-semibold">Review Overview</h3>
                <p className="mt-1 text-sm text-muted-foreground">{result.summary}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <BarScore label="Security" score={result.scores.security} />
                <BarScore label="Performance" score={result.scores.performance} />
                <BarScore label="Maintainability" score={result.scores.maintainability} />
                <BarScore label="Readability" score={result.scores.readability} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-success" /> Strengths
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-success">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border p-4">
              <h4 className="mb-3 text-sm font-semibold">Issue breakdown</h4>
              <div className="space-y-2">
                {SEVERITY_ORDER.map((sev) => (
                  <div key={sev} className="flex items-center justify-between text-sm">
                    <Badge variant={sev}>{sev}</Badge>
                    <span className="font-medium">{counts[sev]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <AnalysisInsights issues={result.issues} scores={result.scores} />

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <h4 className="mb-1 text-sm font-semibold text-primary">Final recommendation</h4>
            <p className="text-sm">{result.finalRecommendation}</p>
          </div>
        </TabsContent>

        <TabsContent value="issues" className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {sortedIssues.length} of {result.issues.length} issue(s)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as Severity | "all")}>
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v as IssueCategory | "all")}
              >
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {presentCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABEL[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as IssueSource | "all")}>
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="ai">{SOURCE_LABEL.ai}</SelectItem>
                  <SelectItem value="static_analysis">{SOURCE_LABEL.static_analysis}</SelectItem>
                </SelectContent>
              </Select>
              {filtersActive && (
                <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
          {sortedIssues.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {result.issues.length === 0 ? (
                <p>No issues found in this review — nice work.</p>
              ) : (
                <>
                  <p>No issues match the current filters.</p>
                  <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onLineClick={
                    issue.lineStart != null
                      ? (lineStart, lineEnd) => handleIssueLineClick(lineStart, lineEnd)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="refactor" className="flex-1">
          <CodeDiffPanel
            ref={diffPanelRef}
            originalCode={originalCode}
            refactoredCode={result.refactoredCode || originalCode}
            language={language}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
