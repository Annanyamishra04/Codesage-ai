"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ErrorResultsState } from "@/components/review/results-states";
import { PlagiarismResultPanel } from "@/components/plagiarism/plagiarism-result-panel";
import { DeletePlagiarismDialog } from "@/components/history/delete-plagiarism-dialog";
import { getPlagiarismCheck, deletePlagiarismCheck } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { LANGUAGE_LABELS, type SupportedLanguage } from "@/types/review";
import type { PlagiarismCheckDetail } from "@/types/plagiarism";

type FetchStatus = "loading" | "success" | "not-found" | "error";

export function PlagiarismDetailView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [check, setCheck] = useState<PlagiarismCheckDetail | null>(null);
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const requestIdRef = useRef(0);

  const fetchCheck = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setStatus("loading");
    setError(null);
    try {
      const c = await getPlagiarismCheck(params.id);
      if (requestIdRef.current !== requestId) return;
      setCheck(c);
      setStatus("success");
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      const message = err instanceof Error ? err.message : "Failed to load plagiarism check.";
      setCheck(null);
      setError(message);
      setStatus(/not found/i.test(message) ? "not-found" : "error");
    }
  }, [params.id]);

  useEffect(() => {
    fetchCheck();
  }, [fetchCheck]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePlagiarismCheck(params.id);
      toast({ title: "Plagiarism check deleted", variant: "success" });
      router.push("/history");
    } catch (err) {
      toast({
        title: "Couldn't delete check",
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
        {status === "success" && check && (
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
          <p className="font-medium">Plagiarism check not found</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            This result may have been deleted or the link is incorrect.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/history">Back to history</Link>
          </Button>
        </div>
      )}

      {status === "error" && (
        <ErrorResultsState message={error ?? "Failed to load plagiarism check."} onRetry={fetchCheck} />
      )}

      {status === "success" && check && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {LANGUAGE_LABELS[check.language as SupportedLanguage] ?? check.language}
            </Badge>
            <span className="text-sm font-medium">{check.title}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground" title={new Date(check.createdAt).toLocaleString()}>
              Checked {formatDate(check.createdAt)}
            </span>
          </div>

          <PlagiarismResultPanel analysis={check} />

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                Snippet A
              </div>
              <pre className="max-h-80 overflow-auto p-3 font-mono text-xs leading-relaxed">
                {check.sourceCode}
              </pre>
            </Card>
            <Card className="overflow-hidden">
              <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                Snippet B
              </div>
              <pre className="max-h-80 overflow-auto p-3 font-mono text-xs leading-relaxed">
                {check.comparisonCode}
              </pre>
            </Card>
          </div>
        </>
      )}

      <DeletePlagiarismDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
