import { expect, test } from "@playwright/test";

test("URL updates with locale prefix when language is changed", async ({ page }) => {
  await page.goto("/explore?preset=standard-run&view=combined");
  await page.waitForSelector("#locale-picker");

  // Switch to Spanish
  await page.selectOption("#locale-picker", "es");
  await expect(page).toHaveURL(/\/es\/explore/);

  // Switch to French
  await page.selectOption("#locale-picker", "fr");
  await expect(page).toHaveURL(/\/fr\/explore/);

  // Switch back to English — locale prefix removed
  await page.selectOption("#locale-picker", "en");
  await expect(page).toHaveURL(/\/explore/);
  expect(new URL(page.url()).pathname).not.toMatch(/^\/(es|fr)\//);
});

test("URL updates with locale prefix on the home page", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#locale-picker");

  await page.selectOption("#locale-picker", "ja");
  await expect(page).toHaveURL(/\/ja\//);
});

test("switching back to English removes locale prefix", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#locale-picker");

  // Switch to Spanish first
  await page.selectOption("#locale-picker", "es");
  await expect(page).toHaveURL(/\/es\//);

  // Switch back to English — wait for URL to change
  await page.selectOption("#locale-picker", "en");
  await page.waitForFunction(() => !location.pathname.startsWith("/es"));
  expect(new URL(page.url()).pathname).not.toMatch(/^\/es/);
});
