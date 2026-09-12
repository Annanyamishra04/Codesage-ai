import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bug,
  ShieldCheck,
  Zap,
  Brush,
  Sparkles,
  ArrowRight,
  Github,
  ScanSearch,
} from "lucide-react";

const features = [
  {
    icon: Bug,
    title: "Bug Detection",
    description: "Surfaces logic errors, edge cases, and correctness issues before they ship.",
  },
  {
    icon: ShieldCheck,
    title: "Security Analysis",
    description: "Flags injection risks, hardcoded secrets, and unsafe patterns like eval().",
  },
  {
    icon: Zap,
    title: "Performance Insights",
    description: "Finds redundant work, inefficient queries, and algorithmic hot spots.",
  },
  {
    icon: Brush,
    title: "Code Quality",
    description: "Highlights readability, naming, and structural concerns worth fixing.",
  },
  {
    icon: Sparkles,
    title: "AI Refactoring",
    description: "Generates an improved version of your code alongside the original.",
  },
  {
    icon: ScanSearch,
    title: "Plagiarism Checker",
    description: "Compares two snippets for copied or lightly-modified code — with matched sections.",
  },
];

export default function LandingPage() {
  // Set at build time; empty/undefined gracefully hides the link rather than
  // pointing at a generic, unrelated GitHub URL.
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL?.trim();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.15), transparent 40%), radial-gradient(circle at 80% 0%, hsl(var(--primary) / 0.1), transparent 35%)",
          }}
        />
        <div className="container flex flex-col items-center gap-6 py-24 text-center sm:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI-powered developer tooling
          </div>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Ship Better Code with{" "}
            <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              AI-Powered Reviews
            </span>
          </h1>
          <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
            CodeSage AI analyzes your code for bugs, security issues, performance
            problems, and maintainability — then hands you a structured review
            and a refactored version, in seconds.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/review">
                Start Reviewing <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#features">View Features</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Free forever · No credit card required · Demo mode works without an AI API key
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Everything a thorough review needs
          </h2>
          <p className="mt-3 text-muted-foreground">
            One paste, six dimensions of analysis, and a concrete plan to improve your code.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="transition-colors hover:border-primary/40">
              <CardContent className="pt-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60">
        <div className="container flex flex-col items-center gap-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Try it on your own code
          </h2>
          <p className="max-w-md text-muted-foreground">
            Create a free account, paste a snippet, and get a full structured review — or run a
            plagiarism/similarity check — in under a minute.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/review">
                Open the Workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/plagiarism">Plagiarism Checker</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/history">View History</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <span>CodeSage AI — a portfolio project.</span>
          {githubUrl ? (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Github className="h-4 w-4" /> View source
            </a>
          ) : (
            <span
              className="inline-flex cursor-not-allowed items-center gap-1.5 opacity-50"
              title="Set NEXT_PUBLIC_GITHUB_URL to enable this link"
              aria-disabled="true"
            >
              <Github className="h-4 w-4" /> View source
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
