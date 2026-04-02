import { expect, test } from "@playwright/test";

test.describe("advanced view chart integrity", () => {
  test("default standard run produces continuous chart lines", async ({ page }) => {
    await page.goto("/advanced");
    await page.waitForSelector("#advanced-charts canvas", { timeout: 15000 });
    await page.waitForTimeout(3000);

    // All datasets should have data points with no NaN values
    const result = await page.evaluate(() => {
      const charts = Object.values(Chart.instances);
      if (!charts.length) return { error: "no charts" };
      return charts[0].data.datasets.map((d: any) => ({
        label: d.label,
        points: d.data.length,
        nans: d.data.filter((p: any) => p && (isNaN(p.y) || !isFinite(p.y))).length,
      }));
    });

    expect(result).not.toHaveProperty("error");
    for (const ds of result as any[]) {
      expect(ds.nans).toBe(0);
      expect(ds.points).toBeGreaterThan(0);
    }
  });

  test("changing a constant still produces valid chart data", async ({ page }) => {
    await page.goto("/advanced");
    await page.waitForSelector("#advanced-charts canvas", { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Open Population accordion and change a constant
    const popAccordion = page.locator("details.accordion summary").filter({ hasText: /Population/i });
    await popAccordion.click();
    await page.waitForTimeout(500);

    // Find first number input in Population section and modify it
    const inputs = page.locator("details.accordion:has(summary:text-is('Population')) input[type=number]");
    const firstInput = inputs.first();
    await firstInput.waitFor({ state: "visible", timeout: 5000 });
    const currentVal = await firstInput.inputValue();
    const newVal = String(Number(currentVal) * 1.1);
    await firstInput.fill(newVal);
    await firstInput.dispatchEvent("change");
    await page.waitForTimeout(4000);

    // Chart should still have valid data
    const result = await page.evaluate(() => {
      const charts = Object.values(Chart.instances);
      if (!charts.length) return { error: "no charts" };
      return charts[0].data.datasets.map((d: any) => ({
        label: d.label,
        points: d.data.length,
        nans: d.data.filter((p: any) => p && (isNaN(p.y) || !isFinite(p.y))).length,
      }));
    });

    expect(result).not.toHaveProperty("error");
    for (const ds of result as any[]) {
      expect(ds.nans).toBe(0);
      expect(ds.points).toBeGreaterThan(0);
    }
  });

  test("compare with standard run shows both solid and dashed lines", async ({ page }) => {
    await page.goto("/advanced");
    await page.waitForSelector("#advanced-charts canvas", { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Click compare button
    await page.click("#advanced-compare");
    await page.waitForTimeout(3000);

    // Should have pairs of datasets (standard + advanced)
    const result = await page.evaluate(() => {
      const charts = Object.values(Chart.instances);
      if (!charts.length) return { error: "no charts" };
      const ds = charts[0].data.datasets;
      return {
        count: ds.length,
        hasStandard: ds.some((d: any) => d.label?.includes("Standard")),
        hasAdvanced: ds.some((d: any) => d.label?.includes("Advanced")),
        allValid: ds.every((d: any) => d.data.every((p: any) => !p || (!isNaN(p.y) && isFinite(p.y)))),
      };
    });

    expect(result).not.toHaveProperty("error");
    expect((result as any).hasStandard).toBe(true);
    expect((result as any).hasAdvanced).toBe(true);
    expect((result as any).allValid).toBe(true);
  });
});
