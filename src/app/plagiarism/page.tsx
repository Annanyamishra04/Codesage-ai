import { requireUserOrRedirect } from "@/lib/auth/current-user";
import { PlagiarismCheckerWorkspace } from "@/components/plagiarism/plagiarism-checker-workspace";

export const dynamic = "force-dynamic";

export default async function PlagiarismCheckerPage() {
  await requireUserOrRedirect("/plagiarism");
  return <PlagiarismCheckerWorkspace />;
}
