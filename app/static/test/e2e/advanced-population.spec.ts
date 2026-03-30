import { expect, test } from "@playwright/test";

test("population constant override produces different le via SimulationProvider", async ({ page }) => {
  await page.goto("/#advanced");
  await page.waitForSelector("#advanced-charts canvas");

  const result = await page.evaluate(async () => {
    const sp = (window as any).SimulationProvider;
    if (!sp) return null;

    const defaultResult = await sp.simulate({});
    const overriddenResult = await sp.simulate({ constants: { len: 40 } });

    return {
      defaultLe: defaultResult.series?.le?.values?.slice(0, 5) ?? [],
      overriddenLe: overriddenResult.series?.le?.values?.slice(0, 5) ?? [],
    };
  });

  expect(result).not.toBeNull();
  expect(result!.defaultLe.length).toBeGreaterThan(0);
  expect(result!.overriddenLe.length).toBeGreaterThan(0);
  expect(result!.overriddenLe).not.toEqual(result!.defaultLe);
});

test("family size override produces different cbr via SimulationProvider", async ({ page }) => {
  await page.goto("/#advanced");
  await page.waitForSelector("#advanced-charts canvas");

  const result = await page.evaluate(async () => {
    const sp = (window as any).SimulationProvider;
    if (!sp) return null;

    const outputVars = { output_variables: ["cbr", "pop", "le"] };
    const defaultResult = await sp.simulate(outputVars);
    // dcfsn = desired completed family size normal; changing it affects birth rates
    const overriddenResult = await sp.simulate({ ...outputVars, constants: { dcfsn: 1.0 } });

    return {
      defaultCbr: defaultResult.series?.cbr?.values?.slice(0, 5) ?? [],
      overriddenCbr: overriddenResult.series?.cbr?.values?.slice(0, 5) ?? [],
    };
  });

  expect(result).not.toBeNull();
  expect(result!.defaultCbr.length).toBeGreaterThan(0);
  expect(result!.overriddenCbr.length).toBeGreaterThan(0);
  expect(result!.overriddenCbr).not.toEqual(result!.defaultCbr);
});

test("changing len input updates population chart", async ({ page }) => {
  await page.goto("/#advanced");
  await page.waitForSelector("#advanced-charts canvas");

  // Switch to sector cards view
  const sectorBtn = page.getByRole("button", { name: /sector/i });
  if (await sectorBtn.isVisible()) {
    await sectorBtn.click();
  }

  await page.waitForSelector("#adv-chart-pop");
  await page.waitForTimeout(600);

  // Capture the initial chart dataset values
  const initialSnapshot = await page.evaluate(() => {
    const canvas = document.getElementById("adv-chart-pop") as HTMLCanvasElement | null;
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

  expect(initialSnapshot).not.toBeNull();
  expect(initialSnapshot!.values.length).toBeGreaterThan(0);

  // Open Population accordion
  await page.locator("summary", { hasText: /population/i }).click();
  const lenInput = page.locator("#const-len");
  await expect(lenInput).toBeVisible({ timeout: 5000 });

  // Halve the len value via direct DOM manipulation to ensure the event fires
  await page.evaluate(() => {
    const input = document.getElementById("const-len") as HTMLInputElement;
    if (!input) return;
    const current = parseFloat(input.value);
    input.value = String(current / 2);
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // Wait for debounced simulation (400ms) + rendering
  await page.waitForTimeout(2000);

  const updatedSnapshot = await page.evaluate(() => {
    const canvas = document.getElementById("adv-chart-pop") as HTMLCanvasElement | null;
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

  // The "edited" dataset values should differ after changing len
  expect(updatedSnapshot!.values).not.toEqual(initialSnapshot!.values);
});
