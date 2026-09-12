import { GitCompareArrows } from "lucide-react";
import type { MatchedSection } from "@/types/plagiarism";

function lineRange(start: number, end: number): string {
  return start === end ? `line ${start}` : `lines ${start}–${end}`;
}

export function MatchedSectionsList({ sections }: { sections: MatchedSection[] }) {
  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No contiguous matching sections of meaningful length were found.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sections.map((section, idx) => (
        <li
          key={idx}
          className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
        >
          <GitCompareArrows className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">Snippet A</span>
          <span className="font-medium">
            {lineRange(section.sourceStartLine, section.sourceEndLine)}
          </span>
          <span className="text-muted-foreground">↔</span>
          <span className="text-muted-foreground">Snippet B</span>
          <span className="font-medium">
            {lineRange(section.comparisonStartLine, section.comparisonEndLine)}
          </span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            ~{section.tokenLength} tokens
          </span>
        </li>
      ))}
    </ul>
  );
}
