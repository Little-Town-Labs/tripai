import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getAuthErrorMessage,
  validateSignInInput,
  validateSignUpInput,
} from "../../src/lib/auth/validation";

test("US1 validates signup input before provider calls", () => {
  const invalid = validateSignUpInput({
    name: "A",
    email: "not-an-email",
    password: "short",
  });

  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.fieldErrors, {
    email: "Enter a valid email address.",
    name: "Display name must be at least 2 characters.",
    password: "Password must be at least 8 characters.",
  });

  const valid = validateSignUpInput({
    name: "Trip Owner",
    email: "owner@example.com",
    password: "correct horse",
  });

  assert.equal(valid.ok, true);
  assert.equal(valid.values.email, "owner@example.com");
  assert.equal(valid.values.name, "Trip Owner");
});

test("US1 validates signin input before provider calls", () => {
  const invalid = validateSignInInput({
    email: "",
    password: "",
  });

  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.fieldErrors, {
    email: "Enter a valid email address.",
    password: "Password is required.",
  });
});

test("US3 maps provider failures to safe user-facing messages", () => {
  assert.equal(
    getAuthErrorMessage("sign-in", new Error("user does not exist")),
    "We could not sign you in with those details.",
  );
  assert.equal(
    getAuthErrorMessage("sign-up", new Error("email already exists")),
    "We could not create that account. Check the details and try again.",
  );
  assert.equal(
    getAuthErrorMessage("provider", new Error("OAuth client_secret invalid")),
    "Google sign-in is temporarily unavailable. Try again in a moment.",
  );
});
