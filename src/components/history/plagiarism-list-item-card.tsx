"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRight } from "lucide-react";
import { LANGUAGE_LABELS, type SupportedLanguage } from "@/types/review";
import { CLASSIFICATION_LABELS, type PlagiarismCheckListItem } from "@/types/plagiarism";
import { formatRelativeDate } from "@/lib/utils";
import { classificationColorClass } from "@/lib/plagiarism-ui";

export function PlagiarismListItemCard({
  check,
  onDelete,
}: {
  check: PlagiarismCheckListItem;
  onDelete: (id: string) => void;
}) {
  const languageLabel = LANGUAGE_LABELS[check.language as SupportedLanguage] ?? check.language;

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="flex items-center gap-4 pt-5">
        <div
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-border"
          title={CLASSIFICATION_LABELS[check.classification]}
        >
          <span className={`text-xl font-bold ${classificationColorClass(check.classification)}`}>
            {check.similarityScore}%
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{languageLabel}</Badge>
            <span className={`text-xs font-medium ${classificationColorClass(check.classification)}`}>
              {CLASSIFICATION_LABELS[check.classification]}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span
              className="text-xs text-muted-foreground"
              title={new Date(check.createdAt).toLocaleString()}
            >
              {formatRelativeDate(check.createdAt)}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{check.title}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onDelete(check.id)} aria-label="Delete plagiarism check">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/history/plagiarism/${check.id}`}>
              View <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
