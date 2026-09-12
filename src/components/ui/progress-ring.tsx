"use client";

import { cn, scoreLabel } from "@/lib/utils";

interface ProgressRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  /** Shows the derived quality label (e.g. "Good") under the score. */
  showQualityLabel?: boolean;
  className?: string;
}

function colorForScore(score: number): string {
  if (score >= 75) return "hsl(var(--success))";
  if (score >= 60) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

/** Circular score indicator used for the overall review score. */
export function ProgressRing({
  score,
  size = 128,
  strokeWidth = 10,
  label,
  showQualityLabel = true,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const color = colorForScore(score);

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
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
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
        </div>
      </div>
      {showQualityLabel && (
        <span className="text-xs font-semibold" style={{ color }}>
          {scoreLabel(score)}
        </span>
      )}
    </div>
  );
}
