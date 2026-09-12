"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRight } from "lucide-react";
import { LANGUAGE_LABELS, type ReviewListItem, type SupportedLanguage } from "@/types/review";
import { formatRelativeDate, scoreColorClass, scoreLabel } from "@/lib/utils";

export function ReviewListItemCard({
  review,
  onDelete,
}: {
  review: ReviewListItem;
  onDelete: (id: string) => void;
}) {
  const languageLabel =
    LANGUAGE_LABELS[review.language as SupportedLanguage] ?? review.language;

  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="flex items-center gap-4 pt-5">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-border" title={scoreLabel(review.overallScore)}>
          <span className={`text-xl font-bold ${scoreColorClass(review.overallScore)}`}>
            {review.overallScore}
          </span>
          <span className="text-[10px] text-muted-foreground">/ 100</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{languageLabel}</Badge>
            <span className={`text-xs font-medium ${scoreColorClass(review.overallScore)}`}>
              {scoreLabel(review.overallScore)}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {review.issueCount} issue{review.issueCount === 1 ? "" : "s"}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground" title={new Date(review.createdAt).toLocaleString()}>
              {formatRelativeDate(review.createdAt)}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{review.summary}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onDelete(review.id)} aria-label="Delete review">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/history/${review.id}`}>
              View <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
