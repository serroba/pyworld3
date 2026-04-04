import { expect, test } from "@playwright/test";

test("URL updates with locale prefix when language is changed", async ({ page }) => {
  await page.goto("/explore?preset=standard-run&view=combined");
  await page.waitForSelector("#locale-picker");

  // Switch to Spanish
  await page.selectOption("#locale-picker", "es");
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/es\/explore/);

  // Switch to French
  await page.selectOption("#locale-picker", "fr");
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/fr\/explore/);

  // Switch back to English — locale prefix removed
  await page.selectOption("#locale-picker", "en");
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/explore/);
  expect(page.url()).not.toMatch(/\/en\//);
});

test("URL updates with locale prefix on the home page", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#locale-picker");

  await page.selectOption("#locale-picker", "ja");
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/ja\//);
});

test("switching back to English removes locale prefix", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#locale-picker");

  // Switch to Spanish first
  await page.selectOption("#locale-picker", "es");
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/es\//);

  // Switch back to English
  await page.selectOption("#locale-picker", "en");
  await page.waitForTimeout(300);
  expect(page.url()).not.toMatch(/\/es\//);
});
