import Link from "next/link";

import { requireCurrentOwner } from "@/lib/auth/owner";

export const dynamic = "force-dynamic";

export default async function OwnerAppPage() {
  const owner = await requireCurrentOwner();

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-8 text-stone-950">
      <section className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-300 pb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">TripAI owner</p>
            <h1 className="mt-2 text-3xl font-semibold">Your trip workspace</h1>
          </div>
          <Link href="/auth/sign-out" className="rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold">
            Sign out
          </Link>
        </header>

        <div className="py-8">
          <p className="text-lg text-stone-700">
            Signed in as <span className="font-semibold text-stone-950">{owner.displayName || owner.email}</span>.
          </p>
          <p className="mt-3 max-w-2xl leading-7 text-stone-700">
            Owner authentication is ready. The next feature can start saving trip intake and generated plans to this
            owner-scoped workspace.
          </p>
        </div>
      </section>
    </main>
  );
}
