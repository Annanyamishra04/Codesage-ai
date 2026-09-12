import { Badge } from "@/components/ui/badge";
import { CLASSIFICATION_LABELS, type SimilarityClassification } from "@/types/plagiarism";
import { cn } from "@/lib/utils";

const VARIANT_CLASS: Record<SimilarityClassification, string> = {
  very_high: "border-destructive/40 bg-destructive/10 text-destructive",
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  moderate: "border-warning/40 bg-warning/10 text-warning",
  low: "border-primary/40 bg-primary/10 text-primary",
  very_low: "border-success/40 bg-success/10 text-success",
};

export function ClassificationBadge({ classification }: { classification: SimilarityClassification }) {
  return (
    <Badge variant="outline" className={cn("border font-medium", VARIANT_CLASS[classification])}>
      {CLASSIFICATION_LABELS[classification]}
    </Badge>
  );
}
