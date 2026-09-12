import { cn } from "@/lib/utils";

function colorClass(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-destructive";
}

export function BarScore({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorClass(score))}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}
