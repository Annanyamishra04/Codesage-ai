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
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from "@/types/review";
import { CLASSIFICATION_LABELS, type PlagiarismCheckListItem } from "@/types/plagiarism";
import { listPlagiarismChecks, deletePlagiarismCheck } from "@/lib/api-client";
import { PlagiarismListItemCard } from "@/components/history/plagiarism-list-item-card";
import { DeletePlagiarismDialog } from "@/components/history/delete-plagiarism-dialog";
import { useToast } from "@/components/ui/toast";

const CLASSIFICATIONS: { label: string; value: string }[] = [
  { label: "Any result", value: "all" },
  { label: CLASSIFICATION_LABELS.very_high, value: "very_high" },
  { label: CLASSIFICATION_LABELS.high, value: "high" },
  { label: CLASSIFICATION_LABELS.moderate, value: "moderate" },
  { label: CLASSIFICATION_LABELS.low, value: "low" },
  { label: CLASSIFICATION_LABELS.very_low, value: "very_low" },
];

export function PlagiarismHistoryTab() {
  const [items, setItems] = useState<PlagiarismCheckListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState<string>("all");
  const [classification, setClassification] = useState<string>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const requestIdRef = useRef(0);

  const hasActiveFilters =
    search.trim().length > 0 || language !== "all" || classification !== "all";
  const clearFilters = () => {
    setSearch("");
    setLanguage("all");
    setClassification("all");
  };

  const fetchItems = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await listPlagiarismChecks({
        search: search || undefined,
        language: language === "all" ? undefined : language,
        classification: classification === "all" ? undefined : classification,
        pageSize: 50,
      });
      if (requestIdRef.current !== requestId) return;
      setItems(res.items);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      const message = err instanceof Error ? err.message : "Please try again.";
      setLoadError(message);
      toast({ title: "Couldn't load history", description: message, variant: "error" });
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, language, classification]);

  useEffect(() => {
    const handle = setTimeout(fetchItems, 300);
    return () => clearTimeout(handle);
  }, [fetchItems]);

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      await deletePlagiarismCheck(pendingDeleteId);
      setItems((prev) => prev.filter((c) => c.id !== pendingDeleteId));
      toast({ title: "Plagiarism check deleted", variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't delete check",
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
            placeholder="Search comparisons…"
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
        <Select value={classification} onValueChange={setClassification}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLASSIFICATIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
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
          <p className="font-medium">Couldn&apos;t load plagiarism history</p>
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
              <p className="font-medium">No checks match your search</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Try a different search term, or clear your filters to see everything.
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <p className="font-medium">No plagiarism checks yet</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Run a comparison from the Plagiarism Checker and save it to see it here.
              </p>
              <Button asChild size="sm">
                <Link href="/plagiarism">Check similarity</Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((check) => (
            <PlagiarismListItemCard key={check.id} check={check} onDelete={setPendingDeleteId} />
          ))}
        </div>
      )}

      <DeletePlagiarismDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
