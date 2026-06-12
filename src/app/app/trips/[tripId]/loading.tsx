export default function TripDetailLoading() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-6 text-stone-950">
      <section className="mx-auto max-w-6xl">
        <div className="h-8 w-36 rounded-md bg-stone-200" />
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_18rem]">
          <div className="space-y-4">
            <div className="h-36 rounded-md border border-stone-300 bg-white" />
            <div className="h-72 rounded-md border border-stone-300 bg-white" />
          </div>
          <div className="h-80 rounded-md border border-stone-300 bg-white" />
        </div>
      </section>
    </main>
  );
}
