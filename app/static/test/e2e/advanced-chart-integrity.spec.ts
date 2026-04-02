import { expect, test } from "@playwright/test";

test.describe("advanced view chart integrity", () => {
  test("default standard run produces continuous chart lines", async ({ page }) => {
    await page.goto("/advanced");
    await page.waitForSelector("#advanced-charts canvas", { timeout: 15000 });
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      const W = window as any;
      const canvases = document.querySelectorAll("#advanced-charts canvas");
      const results: any[] = [];
      canvases.forEach((c: any) => {
        const chart = W.Chart.getChart(c);
        if (!chart) return;
        for (const ds of chart.data.datasets) {
          const points = ds.data as any[];
          results.push({
            label: ds.label,
            points: points.length,
            nans: points.filter((p: any) => p && (isNaN(p.y) || !isFinite(p.y))).length,
            nulls: points.filter((p: any) => p == null || (p && p.y == null)).length,
          });
        }
      });
      return results.length > 0 ? results : { error: "no chart data" };
    });

    expect(result).not.toHaveProperty("error");
    for (const ds of result as any[]) {
      expect(ds.nans).toBe(0);
      expect(ds.nulls).toBe(0);
      expect(ds.points).toBeGreaterThan(0);
    }
  });

  test("changing a constant still produces valid chart data", async ({ page }) => {
    await page.goto("/advanced");
    await page.waitForSelector("#advanced-charts canvas", { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Open first sector accordion (not locale-dependent since we use :first-of-type)
    const firstSectorAccordion = page.locator("#advanced-accordions details.accordion").first();
    if ((await firstSectorAccordion.getAttribute("open")) === null) {
      await firstSectorAccordion.locator("summary").click();
    }
    await page.waitForTimeout(500);

    // Find and modify the first visible number input
    const firstInput = firstSectorAccordion.locator("input[type=number]").first();
    await firstInput.waitFor({ state: "visible", timeout: 5000 });
    const currentVal = await firstInput.inputValue();
    const newVal = String(Number(currentVal) * 1.1);
    await firstInput.fill(newVal);
    await firstInput.dispatchEvent("change");
    await page.waitForTimeout(4000);

    const result = await page.evaluate(() => {
      const W = window as any;
      const canvases = document.querySelectorAll("#advanced-charts canvas");
      const results: any[] = [];
      canvases.forEach((c: any) => {
        const chart = W.Chart.getChart(c);
        if (!chart) return;
        for (const ds of chart.data.datasets) {
          const points = ds.data as any[];
          results.push({
            label: ds.label,
            points: points.length,
            nans: points.filter((p: any) => p && (isNaN(p.y) || !isFinite(p.y))).length,
            nulls: points.filter((p: any) => p == null || (p && p.y == null)).length,
          });
        }
      });
      return results.length > 0 ? results : { error: "no chart data" };
    });

    expect(result).not.toHaveProperty("error");
    for (const ds of result as any[]) {
      expect(ds.nans).toBe(0);
      expect(ds.nulls).toBe(0);
      expect(ds.points).toBeGreaterThan(0);
    }
  });
});
