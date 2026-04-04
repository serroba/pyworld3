import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load the IIFE module and extract the LocaleUrl API.
 * Since it's a plain JS IIFE that assigns to a global, we eval it.
 */
function loadLocaleUrl() {
  const src = readFileSync(
    resolve(__dirname, "../js/locale-url.js"),
    "utf-8",
  );
  const fn = new Function(src + "\nreturn LocaleUrl;");
  return fn() as {
    buildLocaleUrl: (locale: string, path: string, search: string, hash: string) => string;
    stripLocalePrefix: (pathname: string) => { locale: string | null; path: string };
    needsUpdate: (pathname: string, search: string, targetUrl: string) => boolean;
  };
}

const { buildLocaleUrl, stripLocalePrefix, needsUpdate } = loadLocaleUrl();

// ── buildLocaleUrl ──────────────────────────────────────────────

describe("buildLocaleUrl", () => {
  test("adds locale prefix for non-English locale", () => {
    expect(buildLocaleUrl("es", "/explore", "?preset=standard-run", "")).toBe(
      "/es/explore?preset=standard-run",
    );
  });

  test("adds locale prefix for locale with subtag", () => {
    expect(buildLocaleUrl("zh-CN", "/model", "", "")).toBe("/zh-CN/model");
  });

  test("no prefix for English", () => {
    expect(buildLocaleUrl("en", "/explore", "?view=combined", "")).toBe(
      "/explore?view=combined",
    );
  });

  test("no prefix for auto", () => {
    expect(buildLocaleUrl("auto", "/faq", "", "")).toBe("/faq");
  });

  test("no prefix for empty locale", () => {
    expect(buildLocaleUrl("", "/history", "", "")).toBe("/history");
  });

  test("handles root path", () => {
    expect(buildLocaleUrl("fr", "/", "", "")).toBe("/fr/");
  });

  test("handles root path for English", () => {
    expect(buildLocaleUrl("en", "/", "", "")).toBe("/");
  });

  test("preserves hash fragment", () => {
    expect(buildLocaleUrl("ja", "/model", "", "#equations")).toBe(
      "/ja/model#equations",
    );
  });

  test("preserves both search and hash", () => {
    expect(
      buildLocaleUrl("de", "/explore", "?preset=standard-run&view=split", "#top"),
    ).toBe("/de/explore?preset=standard-run&view=split#top");
  });

  test("handles all supported locale formats", () => {
    const locales = ["es", "fr", "de", "ja", "ar", "zh-CN", "zh-TW", "pt-BR", "pt-PT"];
    for (const locale of locales) {
      const url = buildLocaleUrl(locale, "/explore", "", "");
      expect(url).toBe(`/${locale}/explore`);
    }
  });
});

// ── stripLocalePrefix ───────────────────────────────────────────

describe("stripLocalePrefix", () => {
  test("strips two-letter locale prefix", () => {
    expect(stripLocalePrefix("/es/explore")).toEqual({
      locale: "es",
      path: "/explore",
    });
  });

  test("strips locale with subtag", () => {
    expect(stripLocalePrefix("/zh-CN/model")).toEqual({
      locale: "zh-CN",
      path: "/model",
    });
  });

  test("strips locale from root path", () => {
    expect(stripLocalePrefix("/fr/")).toEqual({
      locale: "fr",
      path: "/",
    });
  });

  test("strips locale from bare prefix (no trailing slash)", () => {
    expect(stripLocalePrefix("/ja")).toEqual({
      locale: "ja",
      path: "/",
    });
  });

  test("returns null locale for unprefixed path", () => {
    expect(stripLocalePrefix("/explore")).toEqual({
      locale: null,
      path: "/explore",
    });
  });

  test("returns null locale for root", () => {
    expect(stripLocalePrefix("/")).toEqual({
      locale: null,
      path: "/",
    });
  });

  test("does not match three-letter codes", () => {
    expect(stripLocalePrefix("/eng/explore")).toEqual({
      locale: null,
      path: "/eng/explore",
    });
  });

  test("does not match route segments that look like locales", () => {
    // /advanced starts with /ad which is 2 chars, but /advanced is a route
    expect(stripLocalePrefix("/advanced")).toEqual({
      locale: null,
      path: "/advanced",
    });
  });

  test("handles pt-BR and pt-PT", () => {
    expect(stripLocalePrefix("/pt-BR/history")).toEqual({
      locale: "pt-BR",
      path: "/history",
    });
    expect(stripLocalePrefix("/pt-PT/faq")).toEqual({
      locale: "pt-PT",
      path: "/faq",
    });
  });

  test("preserves deep paths", () => {
    expect(stripLocalePrefix("/es/what-is-world3")).toEqual({
      locale: "es",
      path: "/what-is-world3",
    });
  });
});

// ── needsUpdate ─────────────────────────────────────────────────

describe("needsUpdate", () => {
  test("returns true when locale prefix needs to be added", () => {
    expect(needsUpdate("/explore", "?preset=standard-run", "/es/explore?preset=standard-run")).toBe(true);
  });

  test("returns false when URL already matches", () => {
    expect(needsUpdate("/es/explore", "?preset=standard-run", "/es/explore?preset=standard-run")).toBe(false);
  });

  test("returns true when switching from one locale to another", () => {
    expect(needsUpdate("/es/explore", "", "/fr/explore")).toBe(true);
  });

  test("returns true when removing locale prefix", () => {
    expect(needsUpdate("/es/", "", "/")).toBe(true);
  });

  test("returns false for identical root", () => {
    expect(needsUpdate("/", "", "/")).toBe(false);
  });

  test("ignores hash when comparing", () => {
    expect(needsUpdate("/explore", "", "/explore#top")).toBe(false);
  });
});
