"use client";

import { CLASSIFICATION_LABELS, type SimilarityClassification } from "@/types/plagiarism";
import { cn } from "@/lib/utils";

function colorForClassification(classification: SimilarityClassification): string {
  switch (classification) {
    case "very_high":
      return "hsl(var(--destructive))";
    case "high":
      return "hsl(var(--destructive))";
    case "moderate":
      return "hsl(var(--warning))";
    case "low":
      return "hsl(var(--primary))";
    case "very_low":
    default:
      return "hsl(var(--success))";
  }
}

interface SimilarityRingProps {
  score: number;
  classification: SimilarityClassification;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Same visual language as the review workspace's ProgressRing, but with
 * color semantics inverted: for a similarity score, HIGH is the concerning
 * outcome (red), not the good one (green) — reusing ProgressRing as-is
 * would have sent the opposite signal.
 */
export function SimilarityRing({
  score,
  classification,
  size = 128,
  strokeWidth = 10,
  className,
}: SimilarityRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const color = colorForClassification(classification);

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {score}%
          </span>
          <span className="text-[10px] text-muted-foreground">similarity</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>
        {CLASSIFICATION_LABELS[classification]}
      </span>
    </div>
  );
}
