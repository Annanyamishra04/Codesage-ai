import { Skeleton } from "@/components/ui/skeleton";
import { ScanSearch, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalysisProgress } from "@/components/review/analysis-progress";

export function EmptyResultsState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <ScanSearch className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium">Your next code review starts here</h3>
      <p className="max-w-xs text-sm text-muted-foreground">
        Paste or write code on the left, choose a language, and click{" "}
        <span className="font-medium text-foreground">Review Code</span> to get a
        full structured analysis — issues, scores, and an improved version.
      </p>
    </div>
  );
}

export function LoadingResultsState() {
  return (
    <div className="space-y-6 p-5">
      <AnalysisProgress />
      <div className="flex items-center gap-6">
        <Skeleton className="h-32 w-32 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export function ErrorResultsState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="font-medium">Something went wrong</h3>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
