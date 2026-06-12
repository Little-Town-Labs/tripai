import { notFound } from "next/navigation";

import { TripDetail } from "@/components/trip/trip-detail";
import { createPool } from "@/db/client";
import { requireCurrentOwner } from "@/lib/auth/owner";
import { listShareLinks } from "@/lib/sharing/service";
import { getTripDetail } from "@/lib/trip-detail/service";

export const dynamic = "force-dynamic";

let appPool: ReturnType<typeof createPool> | undefined;

function getAppPool() {
  if (!appPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required to view trip details.");
    }
    appPool = createPool(connectionString);
  }
  return appPool;
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const [{ tripId }, owner] = await Promise.all([params, requireCurrentOwner()]);
  const result = await getTripDetail(getAppPool(), owner.id, { tripId });

  if (!result.ok && result.reason === "not_found") {
    notFound();
  }

  if (!result.ok) {
    return <TripDetail detail={null} />;
  }

  const shareLinks = await listShareLinks(getAppPool(), owner.id, { tripId });

  return (
    <TripDetail
      detail={result.detail}
      shareLinks={shareLinks.ok ? shareLinks.links : []}
    />
  );
}
