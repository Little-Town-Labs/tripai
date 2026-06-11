export type AuthFieldErrors = Partial<Record<"email" | "name" | "password", string>>;

export type SignInInput = {
  email: FormDataEntryValue | string | null;
  password: FormDataEntryValue | string | null;
};

export type SignUpInput = SignInInput & {
  name: FormDataEntryValue | string | null;
};

export type ValidatedSignIn =
  | { ok: true; values: { email: string; password: string } }
  | { ok: false; fieldErrors: AuthFieldErrors };

export type ValidatedSignUp =
  | { ok: true; values: { email: string; name: string; password: string } }
  | { ok: false; fieldErrors: AuthFieldErrors };

export type AuthActionState = {
  error?: string;
  fieldErrors?: AuthFieldErrors;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stringValue(value: FormDataEntryValue | string | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateSignInInput(input: SignInInput): ValidatedSignIn {
  const email = stringValue(input.email).toLowerCase();
  const password = stringValue(input.password);
  const fieldErrors: AuthFieldErrors = {};

  if (!emailPattern.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Password is required.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, values: { email, password } };
}

export function validateSignUpInput(input: SignUpInput): ValidatedSignUp {
  const name = stringValue(input.name);
  const email = stringValue(input.email).toLowerCase();
  const password = stringValue(input.password);
  const fieldErrors: AuthFieldErrors = {};

  if (name.length < 2) {
    fieldErrors.name = "Display name must be at least 2 characters.";
  }

  if (!emailPattern.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, values: { email, name, password } };
}

export function getAuthErrorMessage(
  context: "sign-in" | "sign-up" | "provider",
  error: unknown,
) {
  void error;
  if (context === "sign-in") {
    return "We could not sign you in with those details.";
  }

  if (context === "provider") {
    return "Google sign-in is temporarily unavailable. Try again in a moment.";
  }

  return "We could not create that account. Check the details and try again.";
}
