import { expect, test } from "@playwright/test";

test("US1 signed-in owner can complete the intake wizard", async ({ page }) => {
  await page.goto("/app/intake");

  await expect(page.getByRole("heading", { name: "Plan a family road trip" })).toBeVisible();

  await page.getByLabel("Starting point").fill("St. Louis, MO");
  await page.getByLabel("Florida destination").fill("Orlando, FL");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByLabel("Start date").fill("2026-07-06");
  await page.getByLabel("End date").fill("2026-07-11");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByLabel("Adults").fill("2");
  await page.getByRole("spinbutton", { name: "Children" }).fill("2");
  await page.getByLabel("Children's ages").fill("6, 9");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await page.getByRole("checkbox", { name: "Theme parks" }).check();
  await page.getByRole("checkbox", { name: "Seafood" }).check();
  await page.getByLabel("Budget preference").selectOption("moderate");
  await page.getByLabel("Travel pace").selectOption("balanced");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const saveButton = page.getByRole("button", { name: "Save intake" });
  await expect(saveButton).toBeVisible();
  await saveButton.dispatchEvent("click");

  await expect(page.getByRole("heading", { name: "Your intake is saved" })).toBeVisible();
  await expect(page.getByText("Ready for trip generation", { exact: true })).toBeVisible();
});

test("US2 invalid intake shows errors and preserves entered values", async ({ page }) => {
  await page.goto("/app/intake");

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Enter a starting point.")).toBeVisible();

  await page.getByLabel("Starting point").fill("St. Louis, MO");
  await page.getByLabel("Florida destination").fill("Orlando, FL");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Start date").fill("2026-07-12");
  await page.getByLabel("End date").fill("2026-07-01");
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page.getByText("End date must be the same as or after the start date.")).toBeVisible();
  await expect(page.getByLabel("Starting point")).toHaveValue("St. Louis, MO");
});

test("US2 signed-out visitor is redirected away from intake when bypass is disabled", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: "http://localhost:3000" });
  const page = await context.newPage();

  await page.goto("/app/intake?disableE2EBypass=1");

  await expect(page).toHaveURL(/\/auth\/sign-in/);
  await context.close();
});
