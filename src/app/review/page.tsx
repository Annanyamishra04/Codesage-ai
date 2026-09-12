import { requireUserOrRedirect } from "@/lib/auth/current-user";
import { ReviewWorkspace } from "@/components/review/review-workspace";

export const dynamic = "force-dynamic";

export default async function ReviewWorkspacePage() {
  await requireUserOrRedirect("/review");
  return <ReviewWorkspace />;
}
