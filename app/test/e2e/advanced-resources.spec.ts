import { expect, test } from "@playwright/test";

test("simulation auto-runs without a Run button", async ({ page }) => {
  await page.goto("/#advanced");
  await page.waitForSelector("#advanced-charts canvas");

  // The Run simulation button should not exist
  await expect(page.locator("#advanced-run")).toHaveCount(0);

  // Charts should have rendered automatically
  const canvasCount = await page.locator("#advanced-charts canvas").count();
  expect(canvasCount).toBeGreaterThanOrEqual(1);
});

test("resource constant override produces different nrfr via SimulationProvider", async ({ page }) => {
  await page.goto("/#advanced");
  await page.waitForSelector("#advanced-charts canvas");

  // Use SimulationProvider directly to verify the runtime pipeline
  const result = await page.evaluate(async () => {
    const sp = (window as any).SimulationProvider;
    if (!sp) return null;

    const defaultResult = await sp.simulate({});
    const overriddenResult = await sp.simulate({ constants: { nri: 500000000000 } });

    return {
      defaultNrfr: defaultResult.series?.nrfr?.values?.slice(0, 5) ?? [],
      overriddenNrfr: overriddenResult.series?.nrfr?.values?.slice(0, 5) ?? [],
    };
  });

  expect(result).not.toBeNull();
  expect(result!.defaultNrfr.length).toBeGreaterThan(0);
  expect(result!.overriddenNrfr.length).toBeGreaterThan(0);
  expect(result!.overriddenNrfr).not.toEqual(result!.defaultNrfr);
});

test("changing nri input updates resource chart", async ({ page }) => {
  await page.goto("/#advanced");
  await page.waitForSelector("#advanced-charts canvas");

  // Switch to sector cards view
  const sectorBtn = page.getByRole("button", { name: /sector/i });
  if (await sectorBtn.isVisible()) {
    await sectorBtn.click();
  }

  await page.waitForSelector("#adv-chart-res");
  await page.waitForTimeout(600);

  // Capture the initial chart dataset count and last-dataset values
  // In compare mode, datasets alternate: [baseline_var0, edited_var0, ...]
  // For nrfr only, there are 2 datasets: [0] = baseline, [1] = edited
  const initialSnapshot = await page.evaluate(() => {
    const canvas = document.getElementById("adv-chart-res") as HTMLCanvasElement | null;
    if (!canvas) return null;
    const chart = (globalThis as any).Chart?.getChart(canvas);
    if (!chart) return null;
    const dsCount = chart.data.datasets.length;
    // Get the last dataset (the "edited" one in compare mode, or the only one in single mode)
    const lastDs = chart.data.datasets[dsCount - 1];
    return {
      dsCount,
      values: lastDs?.data?.map((p: { y: number }) => p.y) ?? [],
    };
  });

  expect(initialSnapshot).not.toBeNull();
  expect(initialSnapshot!.values.length).toBeGreaterThan(0);

  // Open Resources accordion
  await page.locator("summary", { hasText: /resource/i }).click();
  const nriInput = page.locator("#const-nri");
  await expect(nriInput).toBeVisible({ timeout: 5000 });

  // Halve the nri value via direct DOM manipulation to ensure the event fires
  await page.evaluate(() => {
    const input = document.getElementById("const-nri") as HTMLInputElement;
    if (!input) return;
    const current = parseFloat(input.value);
    input.value = String(current / 2);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // Wait for debounced simulation (400ms) + rendering
  await page.waitForTimeout(2000);

  const updatedSnapshot = await page.evaluate(() => {
    const canvas = document.getElementById("adv-chart-res") as HTMLCanvasElement | null;
    if (!canvas) return null;
    const chart = (globalThis as any).Chart?.getChart(canvas);
    if (!chart) return null;
    const dsCount = chart.data.datasets.length;
    const lastDs = chart.data.datasets[dsCount - 1];
    return {
      dsCount,
      values: lastDs?.data?.map((p: { y: number }) => p.y) ?? [],
    };
  });

  expect(updatedSnapshot).not.toBeNull();
  expect(updatedSnapshot!.values.length).toBeGreaterThan(0);

  // The "edited" dataset values should differ after changing nri
  expect(updatedSnapshot!.values).not.toEqual(initialSnapshot!.values);
});
