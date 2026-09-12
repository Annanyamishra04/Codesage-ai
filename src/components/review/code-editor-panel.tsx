"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Eraser, FileCode2, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LANGUAGE_LABELS,
  MONACO_LANGUAGE_MAP,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/types/review";
import { MAX_CODE_LENGTH } from "@/lib/validators/schemas";
import { useTheme } from "@/components/layout/theme-provider";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

interface CodeEditorPanelProps {
  code: string;
  onCodeChange: (code: string) => void;
  language: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  onSubmit: () => void;
  onClear: () => void;
  onLoadExample: () => void;
  isSubmitting: boolean;
}

export function CodeEditorPanel({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  onSubmit,
  onClear,
  onLoadExample,
  isSubmitting,
}: CodeEditorPanelProps) {
  const { theme } = useTheme();

  const stats = useMemo(() => {
    const lines = code.length === 0 ? 0 : code.split("\n").length;
    return { chars: code.length, lines };
  }, [code]);

  const overLimit = stats.chars > MAX_CODE_LENGTH;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-muted-foreground" />
          <Select value={language} onValueChange={(v) => onLanguageChange(v as SupportedLanguage)}>
            <SelectTrigger className="h-8 w-[160px]">
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onLoadExample}>
            Load example
          </Button>
          <Button variant="outline" size="sm" onClick={onClear}>
            <Eraser className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      </div>

      <div className="min-h-[320px] flex-1">
        <MonacoEditor
          height="100%"
          language={MONACO_LANGUAGE_MAP[language]}
          value={code}
          onChange={(value) => onCodeChange(value ?? "")}
          theme={theme === "dark" ? "vs-dark" : "light"}
          options={{
            fontSize: 13,
            fontFamily: "var(--font-jetbrains-mono), monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 16 },
            automaticLayout: true,
            wordWrap: "on",
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border p-3">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{stats.lines} lines</span>
          <span className={overLimit ? "font-medium text-destructive" : ""}>
            {stats.chars.toLocaleString()} / {MAX_CODE_LENGTH.toLocaleString()} chars
          </span>
        </div>
        <Button onClick={onSubmit} disabled={isSubmitting || overLimit || code.trim().length === 0}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Reviewing…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> Review Code
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
