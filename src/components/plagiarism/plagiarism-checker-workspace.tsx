"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eraser, Loader2, ScanSearch, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SimpleCodeEditor } from "@/components/plagiarism/simple-code-editor";
import { PlagiarismResultPanel } from "@/components/plagiarism/plagiarism-result-panel";
import { ErrorResultsState } from "@/components/review/results-states";
import { useToast } from "@/components/ui/toast";
import { checkSimilarity, savePlagiarismCheck } from "@/lib/api-client";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/types/review";
import { MAX_PLAGIARISM_CODE_LENGTH } from "@/lib/validators/schemas";
import type { SimilarityAnalysis } from "@/types/plagiarism";

const EXAMPLE_A = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}`;

const EXAMPLE_B = `function computeSum(products) {
  let sum = 0;
  for (let idx = 0; idx < products.length; idx++) {
    sum += products[idx].price * products[idx].quantity;
  }
  return sum;
}`;

type Status = "idle" | "checking" | "success" | "error";

export function PlagiarismCheckerWorkspace() {
  const router = useRouter();
  const { toast } = useToast();

  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [sourceCode, setSourceCode] = useState("");
  const [comparisonCode, setComparisonCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<SimilarityAnalysis | null>(null);

  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const overLimit =
    sourceCode.length > MAX_PLAGIARISM_CODE_LENGTH || comparisonCode.length > MAX_PLAGIARISM_CODE_LENGTH;
  const canCheck =
    sourceCode.trim().length > 0 && comparisonCode.trim().length > 0 && !overLimit;

  const handleLoadExample = () => {
    setSourceCode(EXAMPLE_A);
    setComparisonCode(EXAMPLE_B);
    setLanguage("javascript");
  };

  const handleClear = () => {
    setSourceCode("");
    setComparisonCode("");
    setAnalysis(null);
    setStatus("idle");
    setError(null);
    setSavedId(null);
    setTitle("");
  };

  const handleCheck = async () => {
    if (!canCheck) return;
    setStatus("checking");
    setError(null);
    setSavedId(null);
    try {
      const result = await checkSimilarity({ sourceCode, comparisonCode, language });
      setAnalysis(result);
      setStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to run comparison.";
      setError(message);
      setStatus("error");
    }
  };

  const handleSave = async () => {
    if (!analysis) return;
    setIsSaving(true);
    try {
      const saved = await savePlagiarismCheck({
        sourceCode,
        comparisonCode,
        language,
        title: title.trim() || undefined,
      });
      setSavedId(saved.id);
      toast({ title: "Saved to history", variant: "success" });
    } catch (err) {
      toast({
        title: "Couldn't save comparison",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Code Plagiarism Checker</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A Code Similarity / Plagiarism Analysis of the two snippets you provide below —
            comparing tokenized, normalized structure so renamed variables and reformatting don&apos;t
            hide a copy. This compares only the code you submit; it does not search the internet or
            GitHub.
          </p>
        </div>
        <Select value={language} onValueChange={(v) => setLanguage(v as SupportedLanguage)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {LANGUAGE_LABELS[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Snippet A</span>
            <span className="text-xs text-muted-foreground">{sourceCode.length.toLocaleString()} chars</span>
          </div>
          <div className="h-[280px]">
            <SimpleCodeEditor code={sourceCode} onCodeChange={setSourceCode} language={language} />
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Snippet B (to compare against)</span>
            <span className="text-xs text-muted-foreground">{comparisonCode.length.toLocaleString()} chars</span>
          </div>
          <div className="h-[280px]">
            <SimpleCodeEditor code={comparisonCode} onCodeChange={setComparisonCode} language={language} />
          </div>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleLoadExample}>
            <Sparkles className="h-3.5 w-3.5" /> Load example
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Eraser className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {overLimit && (
            <span className="text-xs font-medium text-destructive">
              Each snippet must be under {MAX_PLAGIARISM_CODE_LENGTH.toLocaleString()} characters.
            </span>
          )}
          <Button onClick={handleCheck} disabled={!canCheck || status === "checking"}>
            {status === "checking" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Checking…
              </>
            ) : (
              <>
                <ScanSearch className="h-4 w-4" /> Check Similarity
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {status === "checking" && (
          <div className="space-y-3 rounded-lg border border-border p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Tokenizing, normalizing, and comparing both snippets…
              </span>
            </div>
          </div>
        )}

        {status === "error" && (
          <ErrorResultsState message={error ?? "Failed to run comparison."} onRetry={handleCheck} />
        )}

        {status === "success" && analysis && (
          <div className="space-y-4">
            <PlagiarismResultPanel analysis={analysis} />

            <Card>
              <CardContent className="flex flex-wrap items-center gap-3 pt-5">
                {savedId ? (
                  <>
                    <p className="text-sm text-muted-foreground">Saved to your history.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      onClick={() => router.push(`/history/plagiarism/${savedId}`)}
                    >
                      View saved result
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      placeholder="Optional title for this comparison"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button size="sm" onClick={handleSave} disabled={isSaving} className="ml-auto">
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" /> Save to history
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {status === "idle" && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ScanSearch className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">Compare two code snippets</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Paste code into both panels above and click <span className="font-medium text-foreground">Check Similarity</span>{" "}
              to get a similarity score, classification, and matched sections.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
