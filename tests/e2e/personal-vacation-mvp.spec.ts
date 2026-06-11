import { expect, test } from "@playwright/test";

test("family can log in, generate a trip, and record stop state", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState("networkidle");

  await expect(page.getByLabel("Family passcode")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Family trip plan, ready before the full platform is." })).toBeVisible();

  await page.getByLabel("Family passcode").fill("trip2026");
  await page.getByRole("button", { name: "Enter trip planner" }).click();

  await expect(page.getByRole("heading", { name: "Trip details" })).toBeVisible();

  await page.getByLabel("Starting from").fill("St. Louis");
  await page.getByLabel("Destination area").fill("Orlando");
  await page.getByLabel("Children ages").fill("6, 9");
  await page.getByRole("button", { name: "Generate family plan" }).click();

  await expect(page.getByText("Orlando", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in Google Maps" })).toBeVisible();

  await page.getByRole("button", { name: "Mark visited" }).first().click();
  await expect(page.getByRole("button", { name: "Visited" }).first()).toBeVisible();

  await page.getByLabel("Rating").first().selectOption("5");
  await page.getByLabel("Family note").first().fill("Good first stop");

  await page.reload();

  await expect(page.getByRole("button", { name: "Visited" }).first()).toBeVisible();
  await expect(page.getByLabel("Rating").first()).toHaveValue("5");
  await expect(page.getByLabel("Family note").first()).toHaveValue("Good first stop");
});
