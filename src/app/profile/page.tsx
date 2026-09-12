import Link from "next/link";
import { Calendar, FileCode2, Mail, ScanSearch, User as UserIcon } from "lucide-react";
import { requireUserOrRedirect } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, scoreColorClass } from "@/lib/utils";
import { classificationColorClass } from "@/lib/plagiarism-ui";
import { LANGUAGE_LABELS, type SupportedLanguage } from "@/types/review";
import { CLASSIFICATION_LABELS, type SimilarityClassification } from "@/types/plagiarism";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default async function ProfilePage() {
  const user = await requireUserOrRedirect("/profile");

  const [reviewCount, plagiarismCount, reviewAgg, plagiarismAgg, recentReviews, recentChecks] =
    await Promise.all([
      prisma.review.count({ where: { userId: user.id } }),
      prisma.plagiarismCheck.count({ where: { userId: user.id } }),
      prisma.review.aggregate({ where: { userId: user.id }, _avg: { overallScore: true } }),
      prisma.plagiarismCheck.aggregate({
        where: { userId: user.id },
        _avg: { similarityScore: true },
      }),
      prisma.review.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, language: true, overallScore: true, createdAt: true },
      }),
      prisma.plagiarismCheck.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, similarityScore: true, classification: true, createdAt: true },
      }),
    ]);

  const activity = [
    ...recentReviews.map((r: (typeof recentReviews)[number]) => ({
      kind: "review" as const,
      id: r.id,
      createdAt: r.createdAt,
      label: `${LANGUAGE_LABELS[r.language as SupportedLanguage] ?? r.language} review`,
      score: r.overallScore,
    })),
    ...recentChecks.map((c: (typeof recentChecks)[number]) => ({
      kind: "plagiarism" as const,
      id: c.id,
      createdAt: c.createdAt,
      label: c.title,
      score: c.similarityScore,
      classification: c.classification as SimilarityClassification,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 8);

  const avgReviewScore = reviewAgg._avg.overallScore;
  const avgSimilarity = plagiarismAgg._avg.similarityScore;

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
          {user.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-semibold">{user.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Joined {formatDate(user.createdAt.toISOString())}
            </span>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="flex items-center gap-2 pt-5 text-xs text-muted-foreground">
          <UserIcon className="h-3.5 w-3.5" />
          <span>User ID:</span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{user.id}</code>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Code reviews" value={String(reviewCount)} />
        <StatCard label="Plagiarism checks" value={String(plagiarismCount)} />
        <StatCard
          label="Avg. review score"
          value={avgReviewScore !== null ? Math.round(avgReviewScore).toString() : "—"}
        />
        <StatCard
          label="Avg. similarity"
          value={avgSimilarity !== null ? `${Math.round(avgSimilarity)}%` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No activity yet. Run a{" "}
                <Link href="/review" className="font-medium text-primary hover:underline">
                  code review
                </Link>{" "}
                or a{" "}
                <Link href="/plagiarism" className="font-medium text-primary hover:underline">
                  plagiarism check
                </Link>{" "}
                to get started.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    {item.kind === "review" ? (
                      <FileCode2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ScanSearch className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={item.kind === "review" ? `/history/${item.id}` : `/history/plagiarism/${item.id}`}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {item.label}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDate(item.createdAt.toISOString())}</p>
                  </div>
                  {item.kind === "review" ? (
                    <span className={`shrink-0 text-sm font-semibold ${scoreColorClass(item.score)}`}>
                      {item.score}/100
                    </span>
                  ) : (
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${classificationColorClass(item.classification)}`}
                    >
                      {item.score}% · {CLASSIFICATION_LABELS[item.classification]}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
