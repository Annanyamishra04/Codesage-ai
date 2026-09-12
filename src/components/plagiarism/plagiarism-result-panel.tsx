import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimilarityRing } from "@/components/plagiarism/similarity-ring";
import { ClassificationBadge } from "@/components/plagiarism/classification-badge";
import { MatchedSectionsList } from "@/components/plagiarism/matched-sections-list";
import type { SimilarityAnalysis } from "@/types/plagiarism";

function BreakdownBar({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="space-y-1.5" title={hint}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/70 transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

export function PlagiarismResultPanel({ analysis }: { analysis: SimilarityAnalysis }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
            <SimilarityRing score={analysis.similarityScore} classification={analysis.classification} />
            <div className="max-w-md space-y-2 text-center sm:text-left">
              <ClassificationBadge classification={analysis.classification} />
              <p className="text-sm text-muted-foreground">{analysis.explanation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Signal breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BreakdownBar
            label="Raw token similarity"
            value={analysis.breakdown.rawTokenSimilarity}
            hint="Similarity of the code after removing comments/whitespace, before touching identifier names."
          />
          <BreakdownBar
            label="Normalized token similarity"
            value={analysis.breakdown.normalizedTokenSimilarity}
            hint="Similarity after abstracting variable/function names and literal values — catches renamed copies."
          />
          <BreakdownBar
            label="Matched sequence coverage"
            value={analysis.breakdown.matchedCoverage}
            hint="Share of the code covered by long contiguous matching runs."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Matched sections</CardTitle>
        </CardHeader>
        <CardContent>
          <MatchedSectionsList sections={analysis.matchedSections} />
        </CardContent>
      </Card>
    </div>
  );
}
