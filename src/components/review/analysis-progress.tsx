"use client";

import { useEffect, useState } from "react";
import { Loader2, CircleDashed, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A single review request has no observable backend phases — it's one
 * request/response round trip. Rather than fabricating fake "connected to
 * server" events, this shows a labeled sequence of the stages a review
 * genuinely passes through (validation, static analysis, then the AI call),
 * advancing on a simple timer purely as a frontend visual aid. It never
 * claims to know the server's real progress, and it stops advancing at the
 * final stage — it does not loop or claim "done" — until the actual response
 * arrives and the parent swaps this out for the results panel.
 */
const STAGES = [
  "Validating source code",
  "Running static analysis",
  "Preparing AI review",
  "Analyzing code quality",
  "Generating recommendations",
] as const;

const STAGE_INTERVAL_MS = 1000;

export function AnalysisProgress() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    setStageIndex(0);
    const interval = window.setInterval(() => {
      setStageIndex((i) => (i < STAGES.length - 1 ? i + 1 : i));
    }, STAGE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className="space-y-2.5 rounded-lg border border-border bg-muted/30 p-4"
      role="status"
      aria-live="polite"
    >
      {STAGES.map((stage, i) => {
        const isDone = i < stageIndex;
        const isActive = i === stageIndex;
        return (
          <div
            key={stage}
            className={cn(
              "flex items-center gap-2.5 text-sm transition-opacity duration-300",
              i > stageIndex && "opacity-40"
            )}
          >
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
            ) : isActive ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            ) : (
              <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={cn(isActive && "font-medium text-foreground", isDone && "text-muted-foreground")}>
              {stage}
              {isActive ? "…" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
