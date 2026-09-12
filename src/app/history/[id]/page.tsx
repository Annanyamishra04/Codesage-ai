import { requireUserOrRedirect } from "@/lib/auth/current-user";
import { ReviewDetailView } from "@/components/history/review-detail-view";

export const dynamic = "force-dynamic";

export default async function ReviewDetailPage() {
  await requireUserOrRedirect("/history");
  return <ReviewDetailView />;
}
