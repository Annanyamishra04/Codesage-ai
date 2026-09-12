import { requireUserOrRedirect } from "@/lib/auth/current-user";
import { HistoryTabs } from "@/components/history/history-tabs";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  await requireUserOrRedirect("/history");

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">History</h1>
        <p className="text-sm text-muted-foreground">
          Browse, search, and manage your past code reviews and plagiarism checks.
        </p>
      </div>
      <HistoryTabs />
    </div>
  );
}
