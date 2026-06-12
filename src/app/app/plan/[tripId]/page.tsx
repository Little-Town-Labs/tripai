import { notFound } from "next/navigation";

import { PlanReview } from "@/components/plan-review/plan-review";
import { createPool } from "@/db/client";
import { requireCurrentOwner } from "@/lib/auth/owner";
import { getPlanReview } from "@/lib/plan-review/service";

export const dynamic = "force-dynamic";

let appPool: ReturnType<typeof createPool> | undefined;

function getAppPool() {
  if (!appPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required to review trip plans.");
    }
    appPool = createPool(connectionString);
  }
  return appPool;
}

export default async function PlanReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ revisionId?: string | string[] }>;
}) {
  const [{ tripId }, query, owner] = await Promise.all([
    params,
    searchParams,
    requireCurrentOwner(),
  ]);
  const revisionId = Array.isArray(query.revisionId) ? query.revisionId[0] : query.revisionId;
  const result = await getPlanReview(getAppPool(), owner.id, { tripId, revisionId });

  if (!result.ok) {
    notFound();
  }

  return <PlanReview review={result.review} />;
}
