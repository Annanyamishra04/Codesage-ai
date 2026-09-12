"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorResultsState } from "@/components/review/results-states";
import { ReviewResultsPanel } from "@/components/review/review-results-panel";
import { DeleteReviewDialog } from "@/components/history/delete-review-dialog";
import { getReview, deleteReview } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { formatDate, scoreColorClass, scoreLabel } from "@/lib/utils";
import { LANGUAGE_LABELS, type ReviewDetail, type SupportedLanguage } from "@/types/review";

type FetchStatus = "loading" | "success" | "not-found" | "error";

export function ReviewDetailView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tracks the in-flight request so a stale response can't overwrite a newer one
  // (e.g. if the user clicks Retry before the previous request settles).
  const requestIdRef = useRef(0);

  /**
   * Reusable data-fetching function: called on initial mount AND on Retry.
   * Always resets loading/error state up front so a successful retry never
   * leaves a stale error message on screen, and a failed retry never leaves
   * stale review data behind.
   */
  const fetchReview = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setStatus("loading");
    setError(null);

    try {
      const r = await getReview(params.id);
      if (requestIdRef.current !== requestId) return; // a newer request has taken over
      setReview(r);
      setStatus("success");
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      const message = err instanceof Error ? err.message : "Failed to load review.";
      setReview(null);
      setError(message);
      // A missing review is a distinct case from a transient server/network error.
      setStatus(/not found/i.test(message) ? "not-found" : "error");
    }
  }, [params.id]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteReview(params.id);
      toast({ title: "Review deleted", variant: "success" });
      router.push("/history");
    } catch (err) {
      toast({
        title: "Couldn't delete review",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
      setIsDeleting(false);
    }
  };

  return (
    <div className="container max-w-4xl py-6">
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/history">
            <ArrowLeft className="h-4 w-4" /> Back to history
          </Link>
        </Button>
        {status === "success" && review && (
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4 text-destructive" /> Delete
          </Button>
        )}
      </div>

      {status === "loading" && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {status === "not-found" && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="font-medium">Review not found</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            This review may have been deleted or the link is incorrect.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/history">Back to history</Link>
          </Button>
        </div>
      )}

      {status === "error" && (
        <ErrorResultsState message={error ?? "Failed to load review."} onRetry={fetchReview} />
      )}

      {status === "success" && review && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {LANGUAGE_LABELS[review.language as SupportedLanguage] ?? review.language}
            </Badge>
            <span className={`text-xs font-semibold ${scoreColorClass(review.overallScore)}`}>
              {review.overallScore}/100 · {scoreLabel(review.overallScore)}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {review.issues.length} issue{review.issues.length === 1 ? "" : "s"}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground" title={new Date(review.createdAt).toLocaleString()}>
              Reviewed {formatDate(review.createdAt)}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">via {review.aiProvider}</span>
          </div>

          <div className="overflow-hidden rounded-lg border border-border" style={{ minHeight: 600 }}>
            <ReviewResultsPanel
              result={review}
              originalCode={review.originalCode}
              language={review.language as SupportedLanguage}
              demoMode={review.aiProvider === "mock"}
            />
          </div>
        </>
      )}

      <DeleteReviewDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
