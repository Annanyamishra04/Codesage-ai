"use client";

import dynamic from "next/dynamic";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Copy, Check, Columns2, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/layout/theme-provider";
import { cn } from "@/lib/utils";
import { MONACO_LANGUAGE_MAP, type SupportedLanguage } from "@/types/review";
import type { OnMount } from "@monaco-editor/react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

// Derived from @monaco-editor/react's own OnMount signature so we don't need
// a direct dependency on the (large) monaco-editor package just for types.
type StandaloneEditor = Parameters<OnMount>[0];
type MonacoNamespace = Parameters<OnMount>[1];

export interface CodeBlockHandle {
  /** Scrolls to and briefly highlights a line range. Fails silently if the line is invalid; queues the request if the editor isn't mounted yet. */
  highlightLine: (lineStart: number, lineEnd?: number | null) => void;
}

const CodeBlock = forwardRef<
  CodeBlockHandle,
  { code: string; language: SupportedLanguage; label: string }
>(function CodeBlock({ code, language, label }, ref) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<StandaloneEditor | null>(null);
  const monacoRef = useRef<MonacoNamespace | null>(null);
  const decorationIdsRef = useRef<string[]>([]);
  // Monaco mounts asynchronously (dynamic import + worker init), which can
  // easily take longer than any fixed UI-level delay. If a highlight request
  // arrives before the editor is ready, we stash it here and apply it as
  // soon as `onMount` fires, instead of silently dropping it.
  const pendingHighlightRef = useRef<{ lineStart: number; lineEnd?: number | null } | null>(null);

  const applyHighlight = (lineStart: number, lineEnd?: number | null) => {
    if (!lineStart || lineStart < 1) return; // never a valid line, regardless of mount state

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) {
      // Editor not mounted yet (still loading, or the tab just switched) —
      // queue it; `onMount` below will replay the most recent request.
      pendingHighlightRef.current = { lineStart, lineEnd };
      return;
    }
    pendingHighlightRef.current = null;

    const model = editor.getModel();
    const totalLines = model?.getLineCount() ?? 0;
    if (totalLines === 0 || lineStart > totalLines) return; // line out of range

    const end = Math.min(lineEnd && lineEnd >= lineStart ? lineEnd : lineStart, totalLines);

    editor.revealLineInCenter(lineStart);
    editor.setSelection(new monaco.Range(lineStart, 1, end, 1));

    decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, [
      {
        range: new monaco.Range(lineStart, 1, end, 1),
        options: { isWholeLine: true, className: "line-highlight-flash" },
      },
    ]);

    window.setTimeout(() => {
      decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, []);
    }, 1800);
  };

  useImperativeHandle(ref, () => ({
    highlightLine: applyHighlight,
  }));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={handleCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="min-h-[280px] flex-1">
        <MonacoEditor
          height="100%"
          language={MONACO_LANGUAGE_MAP[language]}
          value={code}
          theme={theme === "dark" ? "vs-dark" : "light"}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            const pending = pendingHighlightRef.current;
            if (pending) {
              // Let Monaco finish its initial layout pass before scrolling.
              requestAnimationFrame(() => applyHighlight(pending.lineStart, pending.lineEnd));
            }
          }}
          options={{
            readOnly: true,
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12 },
            automaticLayout: true,
            wordWrap: "on",
            domReadOnly: true,
          }}
        />
      </div>
    </div>
  );
});

export interface CodeDiffPanelHandle {
  /** Highlights a line in the "Original code" panel, switching to stacked view on narrow layouts is not needed since both panels are always mounted. */
  highlightOriginalLine: (lineStart: number, lineEnd?: number | null) => void;
}

export const CodeDiffPanel = forwardRef<
  CodeDiffPanelHandle,
  { originalCode: string; refactoredCode: string; language: SupportedLanguage }
>(function CodeDiffPanel({ originalCode, refactoredCode, language }, ref) {
  const [layout, setLayout] = useState<"side-by-side" | "stacked">("side-by-side");
  const originalRef = useRef<CodeBlockHandle | null>(null);

  useImperativeHandle(ref, () => ({
    highlightOriginalLine(lineStart, lineEnd) {
      originalRef.current?.highlightLine(lineStart, lineEnd ?? undefined);
    },
  }));

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-end">
        <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Comparison layout">
          <Button
            variant={layout === "side-by-side" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => setLayout("side-by-side")}
            aria-pressed={layout === "side-by-side"}
          >
            <Columns2 className="h-3.5 w-3.5" /> Side-by-side
          </Button>
          <Button
            variant={layout === "stacked" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => setLayout("stacked")}
            aria-pressed={layout === "stacked"}
          >
            <Rows3 className="h-3.5 w-3.5" /> Stacked
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "grid flex-1 gap-4",
          layout === "side-by-side" ? "lg:grid-cols-2" : "grid-cols-1"
        )}
      >
        <CodeBlock ref={originalRef} code={originalCode} language={language} label="Original code" />
        <CodeBlock code={refactoredCode} language={language} label="Improved code" />
      </div>
    </div>
  );
});
