import { expect, test } from "@playwright/test";

test("US1 auth pages render owner signup and signin choices", async ({ page }) => {
  await page.goto("/auth/sign-up");

  await expect(page.getByRole("heading", { name: "Create your TripAI owner account" })).toBeVisible();
  await expect(page.getByLabel("Display name")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();

  await page.goto("/auth/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in to TripAI" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
});

test("US2 signed-out visitor is redirected away from owner app", async ({ page }) => {
  await page.goto("/app");

  await expect(page).toHaveURL(/\/auth\/sign-in/);
  await expect(page.getByRole("heading", { name: "Sign in to TripAI" })).toBeVisible();
});

test("US3 invalid auth input shows safe validation copy", async ({ page }) => {
  await page.goto("/auth/sign-in");

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Password is required.")).toBeVisible();
});
