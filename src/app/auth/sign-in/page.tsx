import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <AuthCard
      title="Sign in to TripAI"
      description="Only trip owners sign in. Family members will join later through private share links."
      footer={
        <>
          New to TripAI?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-emerald-800">
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm />
    </AuthCard>
  );
}
