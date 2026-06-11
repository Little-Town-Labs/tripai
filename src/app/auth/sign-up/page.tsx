import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your TripAI owner account"
      description="Use this owner account to keep your trip plans private and tied to you."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="font-semibold text-emerald-800">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
