import { notFound } from "next/navigation";

import { SharedTripDetail } from "@/components/trip/shared-trip-detail";
import { createPool } from "@/db/client";
import { getSharedTrip } from "@/lib/sharing/service";

export const dynamic = "force-dynamic";

let appPool: ReturnType<typeof createPool> | undefined;

function getAppPool() {
  if (!appPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required to view shared trips.");
    }
    appPool = createPool(connectionString);
  }
  return appPool;
}

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getSharedTrip(getAppPool(), { token });

  if (!result.ok) {
    notFound();
  }

  return <SharedTripDetail detail={result.detail} token={token} />;
}
