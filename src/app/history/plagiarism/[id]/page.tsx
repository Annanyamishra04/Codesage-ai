import { requireUserOrRedirect } from "@/lib/auth/current-user";
import { PlagiarismDetailView } from "@/components/plagiarism/plagiarism-detail-view";

export const dynamic = "force-dynamic";

export default async function PlagiarismCheckDetailPage() {
  await requireUserOrRedirect("/history");
  return <PlagiarismDetailView />;
}
