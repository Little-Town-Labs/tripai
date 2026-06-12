export default function PlanReviewLoading() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-8 text-stone-950">
      <section className="mx-auto max-w-6xl">
        <div className="h-5 w-32 animate-pulse rounded bg-stone-300" />
        <div className="mt-4 h-10 w-3/4 max-w-2xl animate-pulse rounded bg-stone-300" />
        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-md bg-stone-200" />
            <div className="h-56 animate-pulse rounded-md bg-stone-200" />
          </div>
          <div className="h-64 animate-pulse rounded-md bg-stone-200" />
        </div>
      </section>
    </main>
  );
}
