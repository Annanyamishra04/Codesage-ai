"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Inbox, AlertTriangle } from "lucide-react";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type ReviewListItem } from "@/types/review";
import { listReviews, deleteReview } from "@/lib/api-client";
import { ReviewListItemCard } from "@/components/history/review-list-item-card";
import { DeleteReviewDialog } from "@/components/history/delete-review-dialog";
import { useToast } from "@/components/ui/toast";

const SCORE_RANGES = [
  { label: "Any score", min: undefined, max: undefined },
  { label: "80–100 (Great)", min: 80, max: 100 },
  { label: "60–79 (Okay)", min: 60, max: 79 },
  { label: "0–59 (Needs work)", min: 0, max: 59 },
];

export function ReviewHistoryTab() {
  const [items, setItems] = useState<ReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<string>("all");
  const [scoreRangeIdx, setScoreRangeIdx] = useState(0);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  // Bumped on every fetch; a response only gets applied if it's still the
  // most recent one requested, so a slow earlier request can't clobber a
  // faster later one (e.g. typing quickly in the search box).
  const requestIdRef = useRef(0);

  const hasActiveFilters = search.trim().length > 0 || language !== "all" || scoreRangeIdx !== 0;
  const clearFilters = () => {
    setSearch("");
    setLanguage("all");
    setScoreRangeIdx(0);
  };

  const fetchItems = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const range = SCORE_RANGES[scoreRangeIdx];
      const res = await listReviews({
        search: search || undefined,
        language: language === "all" ? undefined : language,
        minScore: range.min,
        maxScore: range.max,
        pageSize: 50,
      });
      if (requestIdRef.current !== requestId) return; // superseded by a newer request
      setItems(res.items);
    } catch (err) {
      if (requestIdRef.current !== requestId) return; // superseded by a newer request
      const message = err instanceof Error ? err.message : "Please try again.";
      setLoadError(message);
      toast({
        title: "Couldn't load history",
        description: message,
        variant: "error",
      });
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, language, scoreRangeIdx]);

  useEffect(() => {
    const handle = setTimeout(fetchItems, 300);
    return () => clearTimeout(handle);
  }, [fetchItems]);

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteReview(pendingDeleteId);
      setItems((prev) => prev.filter((r) => r.id !== pendingDeleteId));
      toast({ title: "Review deleted", variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't delete review",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reviews…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {LANGUAGE_LABELS[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(scoreRangeIdx)}
          onValueChange={(v) => setScoreRangeIdx(Number(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCORE_RANGES.map((r, i) => (
              <SelectItem key={r.label} value={String(i)}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-destructive/40 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <p className="font-medium">Couldn&apos;t load review history</p>
          <p className="max-w-xs text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" size="sm" onClick={fetchItems}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          {hasActiveFilters ? (
            <>
              <p className="font-medium">No reviews match your search</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Try a different search term, or clear your filters to see everything.
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <p className="font-medium">No reviews yet</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Run a review from the workspace and it will show up here, searchable and filterable.
              </p>
              <Button asChild size="sm">
                <Link href="/review">Start a review</Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((review) => (
            <ReviewListItemCard
              key={review.id}
              review={review}
              onDelete={setPendingDeleteId}
            />
          ))}
        </div>
      )}

      <DeleteReviewDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
