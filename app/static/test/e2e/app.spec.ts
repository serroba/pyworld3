import { expect, test } from "@playwright/test";

test("homepage loads standard run in the classic combined chart view", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("World3 — Systems Simulation Explorer");
  await expect(page.locator("nav.site-nav")).toBeVisible();
  await page.waitForURL(/#explore\?preset=standard-run&view=combined/);
  await page.waitForSelector("#explore-charts canvas");
  await expect(page.locator("#explore-charts canvas")).toHaveCount(1);
  await expect(page.locator(".chart-panel__title")).toContainText("Classic World3 Overview");
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
  await expect(page.locator("#compare-metrics")).toContainText("Total population");
});

test("advanced, calibrate, and validate flows render locally", async ({ page }) => {
  await page.goto("/#advanced");
  await page.waitForSelector("#advanced-charts canvas");

  await page.goto("/#calibrate");
  await page.click("#calibrate-run");
  await page.waitForSelector("#calibrate-results table, #calibrate-status .card");

  await page.click("#validate-run");
  await page.waitForSelector("#validate-results table, #validate-status .card");
});

test.describe("localization", () => {
  test.use({ locale: "de-DE" });

  test("uses browser locale by default when supported", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/#explore\?preset=standard-run&view=combined/);
    await expect(page).toHaveTitle("World3 — Systemsimulations-Explorer");
    await expect(page.locator("nav.site-nav")).toContainText("Erkunden");
    await expect(page.locator(".chart-view-toggle")).toContainText("Klassisches Einzelchart");
  });
});

test.describe("spanish localization", () => {
  test.use({ locale: "es-ES" });

  test("uses spanish browser locale when supported", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/#explore\?preset=standard-run&view=combined/);
    await expect(page).toHaveTitle("World3 — Explorador de Simulación de Sistemas");
    await expect(page.locator("nav.site-nav")).toContainText("Explorar");
    await expect(page.locator(".chart-view-toggle")).toContainText("Gráfico clásico único");
    await expect(page.locator(".chart-panel__title")).toContainText("Vista clásica de World3");
  });

  test("uses spanish browser locale for content as well as chrome", async ({ page }) => {
    await page.goto("/#intro");
    await expect(page).toHaveTitle("World3 — Explorador de Simulación de Sistemas");
    await expect(page.locator("nav.site-nav")).toContainText("Explorar");
    await expect(page.locator("#view-intro .hero")).toContainText("En 1972, un equipo de investigadores del MIT");
    await expect(page.locator("#view-intro .ack")).toContainText("Los límites del crecimiento");
  });
});

test("persists a manual language choice across reloads", async ({ page }) => {
  await page.goto("/");
  await page.selectOption("#locale-picker", "ja");
  await expect(page).toHaveTitle("World3 — システムシミュレーション・エクスプローラー");
  await expect(page.locator("#locale-picker")).toHaveValue("ja");
  await expect(page.locator("nav.site-nav")).toContainText("探索");

  await page.reload();
  await page.waitForURL(/#explore\?preset=standard-run&view=combined/);
  await expect(page.locator("#locale-picker")).toHaveValue("ja");
  await expect(page.locator("nav.site-nav")).toContainText("探索");
});

test("supports rtl layout for arabic", async ({ page }) => {
  await page.goto("/");
  await page.selectOption("#locale-picker", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("nav.site-nav")).toContainText("استكشاف");
});
