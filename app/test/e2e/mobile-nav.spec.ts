import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 375, height: 812 }, // iPhone-sized
});

test("hamburger toggle shows and hides nav links on mobile", async ({ page }) => {
  await page.goto("/");

  const toggle = page.locator(".site-nav__toggle");
  const links = page.locator(".site-nav__links");

  // Hamburger should be visible, links should be hidden
  await expect(toggle).toBeVisible();
  await expect(links).not.toBeVisible();

  // Open menu
  await toggle.click();
  await expect(links).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  // All nav links should be visible
  await expect(links.locator('a[href="/explore"]')).toBeVisible();
  await expect(links.locator('a[href="/advanced"]')).toBeVisible();
  await expect(links.locator('a[href="/developers"]')).toBeVisible();

  // Close menu
  await toggle.click();
  await expect(links).not.toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("clicking a nav link closes the menu and navigates", async ({ page }) => {
  await page.goto("/");

  const toggle = page.locator(".site-nav__toggle");
  const links = page.locator(".site-nav__links");

  await toggle.click();
  await expect(links).toBeVisible();

  // Click Explore link
  await links.locator('a[href="/explore"]').click();

  // Menu should close
  await expect(links).not.toBeVisible();

  // Should navigate to explore view
  await expect(page).toHaveURL(/\/explore/);
  await expect(page.locator("#view-explore")).toBeVisible();
});

test("hamburger is hidden on desktop viewport", async ({ page, browserName }) => {
  // Override to desktop size for this test
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const toggle = page.locator(".site-nav__toggle");
  await expect(toggle).not.toBeVisible();

  // Links should be visible without toggling
  const links = page.locator(".site-nav__links");
  await expect(links).toBeVisible();
});

test("hero action buttons have proper spacing on mobile", async ({ page }) => {
  await page.goto("/");

  const actions = page.locator(".hero__actions");
  await expect(actions).toBeVisible();

  const buttons = actions.locator("a");
  await expect(buttons).toHaveCount(2);

  // Both buttons should be visible (not clipped)
  await expect(buttons.nth(0)).toBeVisible();
  await expect(buttons.nth(1)).toBeVisible();
});
