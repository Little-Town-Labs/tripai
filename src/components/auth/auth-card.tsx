import Link from "next/link";
import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-10 text-stone-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <Link href="/" className="mb-8 text-sm font-semibold text-emerald-800">
          TripAI
        </Link>
        <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-5 border-t border-stone-200 pt-4 text-sm text-stone-700">{footer}</div>
        </section>
      </div>
    </main>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <p id={id} className="text-sm font-medium text-red-700">
      {message}
    </p>
  );
}
