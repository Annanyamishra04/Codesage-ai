"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { MONACO_LANGUAGE_MAP, type SupportedLanguage } from "@/types/review";
import { useTheme } from "@/components/layout/theme-provider";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

interface SimpleCodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  language: SupportedLanguage;
}

export function SimpleCodeEditor({ code, onCodeChange, language }: SimpleCodeEditorProps) {
  const { theme } = useTheme();

  return (
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
        padding: { top: 12 },
        automaticLayout: true,
        wordWrap: "on",
      }}
    />
  );
}
