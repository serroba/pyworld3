import { describe, expect, test } from "vitest";

/**
 * Tests for the router's static-file link detection.
 *
 * The SPA router skips hrefs that contain a file extension so the browser
 * handles them as normal navigation (e.g. /openapi.json, /agent.json).
 * This regex is inlined in router.js — we test the same pattern here.
 */

const FILE_EXT_PATTERN = /\.\w+$/;

function isStaticFileHref(href: string): boolean {
  const pathname = href.split(/[?#]/)[0] ?? href;
  return FILE_EXT_PATTERN.test(pathname);
}

describe("router static-file link detection", () => {
  test.each([
    "/openapi.json",
    "/agent.json",
    "/data/functions-table-world3.json",
    "/assets/brand/og-image.png",
    "/css/style.css",
    "/vendor/chart.min.js",
  ])("skips static file: %s", (href) => {
    expect(isStaticFileHref(href)).toBe(true);
  });

  test.each([
    "/explore",
    "/developers",
    "/compare",
    "/advanced",
    "/history",
    "/faq",
    "/",
    "/what-is-world3",
    "/es/explore",
  ])("does NOT skip SPA route: %s", (href) => {
    expect(isStaticFileHref(href)).toBe(false);
  });

  test("ignores query params when checking for extension", () => {
    expect(isStaticFileHref("/openapi.json?v=2")).toBe(true);
    expect(isStaticFileHref("/explore?preset=standard-run")).toBe(false);
  });

  test("ignores hash fragments when checking for extension", () => {
    expect(isStaticFileHref("/openapi.json#schema")).toBe(true);
    expect(isStaticFileHref("/openapi.json?v=2#schema")).toBe(true);
    expect(isStaticFileHref("/explore#top")).toBe(false);
  });
});
