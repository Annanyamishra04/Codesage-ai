"use client";

import { useEffect, useState } from "react";
import { CodeEditorPanel } from "@/components/review/code-editor-panel";
import { ReviewResultsPanel } from "@/components/review/review-results-panel";
import {
  EmptyResultsState,
  ErrorResultsState,
  LoadingResultsState,
} from "@/components/review/results-states";
import { EXAMPLE_SNIPPETS } from "@/lib/examples";
import { createReview, getConfig } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import type { CodeReviewResult, SupportedLanguage } from "@/types/review";

type Status = "idle" | "loading" | "success" | "error";

export function ReviewWorkspace() {
  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewedCode, setReviewedCode] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getConfig()
      .then((c) => setDemoMode(c.demoMode))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (code.trim().length === 0) return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const review = await createReview(code, language);
      setResult(review);
      setReviewedCode(code);
      setStatus("success");
      toast({
        title: "Review complete",
        description: `Found ${review.issues.length} issue(s) — score ${review.overallScore}/100.`,
        variant: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setErrorMessage(message);
      setStatus("error");
      toast({ title: "Review failed", description: message, variant: "error" });
    }
  };

  const handleLoadExample = () => {
    setCode(EXAMPLE_SNIPPETS[language]);
  };

  const handleClear = () => {
    setCode("");
    setResult(null);
    setStatus("idle");
  };

  return (
    <div className="container flex h-[calc(100vh-3.5rem)] flex-col gap-4 py-4">
      <div>
        <h1 className="text-xl font-semibold">Code Review Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Paste your code, pick a language, and get a full structured review.
        </p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border">
          <CodeEditorPanel
            code={code}
            onCodeChange={setCode}
            language={language}
            onLanguageChange={(lang) => {
              setLanguage(lang);
            }}
            onSubmit={handleSubmit}
            onClear={handleClear}
            onLoadExample={handleLoadExample}
            isSubmitting={status === "loading"}
          />
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          {status === "idle" && <EmptyResultsState />}
          {status === "loading" && <LoadingResultsState />}
          {status === "error" && (
            <ErrorResultsState message={errorMessage} onRetry={handleSubmit} />
          )}
          {status === "success" && result && (
            <ReviewResultsPanel
              result={result}
              originalCode={reviewedCode}
              language={language}
              demoMode={demoMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
