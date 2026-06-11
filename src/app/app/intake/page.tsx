import Link from "next/link";
import { redirect } from "next/navigation";

import { IntakeWizard } from "@/components/intake/intake-wizard";
import { requireCurrentOwner } from "@/lib/auth/owner";

export const dynamic = "force-dynamic";

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ disableE2EBypass?: string | string[] }>;
}) {
  const params = await searchParams;
  if (
    process.env.TRIPAI_E2E_AUTH_BYPASS === "1" &&
    process.env.NODE_ENV !== "production" &&
    params.disableE2EBypass !== undefined
  ) {
    redirect("/auth/sign-in");
  }

  const owner = await requireCurrentOwner();

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-8 text-stone-950">
      <section className="mx-auto grid max-w-4xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-300 pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">TripAI intake</p>
            <h1 className="mt-2 text-3xl font-semibold">Plan a family road trip</h1>
            <p className="mt-3 max-w-2xl leading-7 text-stone-700">
              Tell TripAI what kind of Florida road trip you are considering. These are planning preferences, not
              commitments.
            </p>
          </div>
          <Link href="/app" className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold">
            Workspace
          </Link>
        </header>

        <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="mb-5 text-sm text-stone-600">
            Saving for <span className="font-semibold text-stone-950">{owner.displayName || owner.email}</span>.
          </p>
          <IntakeWizard />
        </div>
      </section>
    </main>
  );
}
