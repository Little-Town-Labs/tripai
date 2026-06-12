import { notFound } from "next/navigation";

import { CheckoutPanel } from "@/components/checkout/checkout-panel";
import { createPool } from "@/db/client";
import { requireCurrentOwner } from "@/lib/auth/owner";
import { loadCheckoutConfig } from "@/lib/checkout/config";
import { getCheckoutStatus } from "@/lib/checkout/service";

export const dynamic = "force-dynamic";

let appPool: ReturnType<typeof createPool> | undefined;

function getAppPool() {
  if (!appPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required to view checkout.");
    }
    appPool = createPool(connectionString);
  }
  return appPool;
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const [{ tripId }, owner] = await Promise.all([params, requireCurrentOwner()]);
  const result = await getCheckoutStatus(getAppPool(), owner.id, tripId, loadCheckoutConfig());

  if (!result.ok) {
    notFound();
  }

  return <CheckoutPanel checkout={result} />;
}
