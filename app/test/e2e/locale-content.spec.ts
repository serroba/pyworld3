/**
 * E2E tests for locale translation of data-driven content.
 *
 * The existing localization tests only check static chrome (nav, toggles).
 * These tests verify that preset names, preset descriptions, and variable
 * labels are also translated when a non-English locale is active.
 */

import { expect, test } from "@playwright/test";

test.describe("German locale — data-driven content", () => {
  test.use({ locale: "de-DE" });

  test("explore: preset pills are translated", async ({ page }) => {
    await page.goto("/de/explore?preset=standard-run&view=combined");
    await page.waitForSelector(".pill");
    const pills = await page.locator(".pill").allTextContents();
    expect(pills).toContain("Optimistische Technologie");
    expect(pills).toContain("Standardlauf");
    expect(pills).toContain("AI-Skalierung");
  });

  test("explore: chart panel titles are translated", async ({ page }) => {
    await page.goto("/de/explore?preset=standard-run&view=split");
    await page.waitForSelector(".chart-panel__title");
    const titles = await page.locator(".chart-panel__title").allTextContents();
    expect(titles.some((t) => t.includes("Bevölkerung"))).toBe(true);
  });

  test("compare: preset dropdown options are translated", async ({ page }) => {
    await page.goto("/de/compare?a=optimistic-technology&b=ai-scaling");
    // Wait for the page to fully render (metrics table implies simulation + i18n both done)
    await page.waitForSelector(".metrics-table");
    const opts = await page.locator("#compare-select-a option").allTextContents();
    expect(opts.some((o) => o.includes("Optimistische Technologie"))).toBe(true);
    expect(opts.some((o) => o.includes("AI-Skalierung"))).toBe(true);
  });

  test("compare: table metric labels are translated", async ({ page }) => {
    await page.goto("/de/compare?a=optimistic-technology&b=standard-run");
    await page.waitForSelector(".metrics-table td");
    const labels = await page.locator(".metrics-table td:first-child").allTextContents();
    expect(labels.some((l) => l.includes("Gesamtbevölkerung") || l.includes("Bevölkerung"))).toBe(true);
  });

  test("compare: table column headers use translated preset names", async ({ page }) => {
    await page.goto("/de/compare?a=optimistic-technology&b=standard-run");
    await page.waitForSelector(".metrics-table th");
    const headers = await page.locator(".metrics-table th").allTextContents();
    // Second and third headers are the preset name labels
    expect(headers.some((h) => h.includes("Optimistische Technologie"))).toBe(true);
    expect(headers.some((h) => h.includes("Standardlauf"))).toBe(true);
  });
});

test.describe("Spanish locale — data-driven content", () => {
  test.use({ locale: "es-ES" });

  test("explore: preset pills are translated", async ({ page }) => {
    await page.goto("/es/explore?preset=standard-run&view=combined");
    await page.waitForSelector(".pill");
    const pills = await page.locator(".pill").allTextContents();
    expect(pills).toContain("Tecnología optimista");
    expect(pills).toContain("Escalado de AI");
  });

  test("compare: preset dropdown options are translated", async ({ page }) => {
    await page.goto("/es/compare?a=optimistic-technology&b=ai-scaling");
    await page.waitForSelector(".metrics-table");
    const opts = await page.locator("#compare-select-a option").allTextContents();
    expect(opts.some((o) => o.includes("Tecnología optimista"))).toBe(true);
    expect(opts.some((o) => o.includes("Escalado de AI"))).toBe(true);
  });
});
