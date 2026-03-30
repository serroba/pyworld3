import { expect, test } from "@playwright/test";

test("homepage loads with navigation and presets", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("World3 — Systems Simulation Explorer");
  await expect(page.locator("nav.site-nav")).toBeVisible();
  await page.waitForSelector("#intro-presets .card");
  await expect(page.locator("#intro-presets .card")).not.toHaveCount(0);
});

test("explore view supports sector cards and classic combined chart", async ({ page }) => {
  await page.goto("/#explore?preset=standard-run");
  await page.waitForSelector("#explore-charts canvas");
  await expect(page.locator("#explore-charts canvas")).toHaveCount(4);

  await page.getByRole("button", { name: "Classic single chart" }).click();
  await page.waitForURL(/view=combined/);
  await expect(page.locator("#explore-charts canvas")).toHaveCount(1);
  await expect(page.locator(".chart-panel__title")).toContainText("Classic World3 Overview");
});

test("compare view renders metrics without a backend", async ({ page }) => {
  await page.goto("/#compare");
  await page.waitForFunction(
    () => document.querySelectorAll("#compare-select-a option").length > 0,
  );
  await page.locator("#compare-select-a").selectOption({ index: 0 });
  await page.locator("#compare-select-b").selectOption({ index: 1 });
  await page.waitForSelector("#compare-metrics tr, #compare-metrics .metric-row");
  await expect(page.locator("#compare-metrics")).toContainText("Population");
});

test("advanced, calibrate, and validate flows render locally", async ({ page }) => {
  await page.goto("/#advanced");
  await page.click("#advanced-run");
  await page.waitForSelector("#advanced-charts canvas");

  await page.goto("/#calibrate");
  await page.click("#calibrate-run");
  await page.waitForSelector("#calibrate-results table, #calibrate-status .card");

  await page.click("#validate-run");
  await page.waitForSelector("#validate-results table, #validate-status .card");
});
