"use server";

import { redirect } from "next/navigation";

import { auth } from "./server";
import {
  type AuthActionState,
  getAuthErrorMessage,
  validateSignInInput,
  validateSignUpInput,
} from "./validation";

export async function signUpWithEmail(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = validateSignUpInput({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }

  const { error } = await auth.signUp.email(parsed.values);

  if (error) {
    return { error: getAuthErrorMessage("sign-up", error) };
  }

  redirect("/app");
}

export async function signInWithEmail(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = validateSignInInput({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors };
  }

  const { error } = await auth.signIn.email(parsed.values);

  if (error) {
    return { error: getAuthErrorMessage("sign-in", error) };
  }

  redirect("/app");
}

export async function signOutOwner() {
  await auth.signOut();
  redirect("/auth/sign-in");
}
