import { signOutOwner } from "@/lib/auth/actions";

export default function SignOutPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-10 text-stone-950">
      <form action={signOutOwner} className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold">Sign out</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">End this owner session on this browser.</p>
          <button
            type="submit"
            className="mt-6 min-h-11 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900"
          >
            Sign out
          </button>
        </section>
      </form>
    </main>
  );
}
