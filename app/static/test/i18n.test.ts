import { beforeEach, describe, expect, test, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as CoreIndex from "../ts/core/index.ts";
import {
  buildLocaleFallbackChain,
  createI18n,
  normalizeLocale,
  resolveSupportedLocale,
} from "../ts/i18n.ts";

type StorageStub = {
  values: Record<string, string>;
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function makeStorage(): StorageStub {
  return {
    values: {},
    getItem(key) {
      return this.values[key] ?? null;
    },
    setItem(key, value) {
      this.values[key] = value;
    },
    removeItem(key) {
      delete this.values[key];
    },
  };
}

describe("i18n", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    document.title = "World3";
    document.body.innerHTML = '<button data-i18n="nav.home">Home</button>';
    vi.restoreAllMocks();
  });

  test("normalizes locale tags and resolves fallback chains", () => {
    expect(normalizeLocale("pt_br")).toBe("pt-BR");
    expect(normalizeLocale("-us")).toBe("-US");
    expect(normalizeLocale("zh-hant-tw")).toBe("zh-hant-TW");
    expect(normalizeLocale("  ")).toBe("en");
    expect(buildLocaleFallbackChain("zh-TW")).toEqual(["zh-TW", "zh", "en"]);
    expect(resolveSupportedLocale("de-DE").code).toBe("de");
    expect(resolveSupportedLocale("zh-TW").code).toBe("zh-CN");
    expect(resolveSupportedLocale("zz-ZZ").code).toBe("en");
    expect(resolveSupportedLocale("").code).toBe("en");
  });

  test("loads the browser locale by default and updates document direction", async () => {
    const storage = makeStorage();
    const i18n = createI18n({
      storage,
      getNavigatorLanguages: () => ["de-DE"],
      catalogLoader: async (locale) => {
        if (locale === "en") {
          return {
            "meta.title": "World3 — Systems Simulation Explorer",
            "nav.home": "Home",
          };
        }
        return {
          "nav.home": "Startseite",
        };
      },
    });

    await i18n.init();

    expect(i18n.getLocale()).toBe("auto");
    expect(i18n.getResolvedLocale()).toBe("de");
    expect(i18n.t("nav.home")).toBe("Startseite");
    expect(document.documentElement.lang).toBe("de");
    expect(document.documentElement.dir).toBe("ltr");
    expect(document.title).toBe("World3 — Systems Simulation Explorer");
    expect(document.querySelector("[data-i18n='nav.home']")?.textContent).toBe("Startseite");
    expect(i18n.formatNumber(1234.5, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })).toBe("1.234,5");
  });

  test("persists explicit locale choice and falls back to english keys", async () => {
    const storage = makeStorage();
    const i18n = createI18n({
      storage,
      getNavigatorLanguages: () => ["en-AU"],
      catalogLoader: async (locale) => {
        if (locale === "en") {
          return {
            "meta.title": "World3",
            "nav.home": "Home",
            "explore.title": "Explore a scenario",
          };
        }
        return {
          "nav.home": "日本語ホーム",
        };
      },
    });

    await i18n.setLocale("ja");

    expect(storage.values["world3.locale"]).toBe("ja");
    expect(i18n.getResolvedLocale()).toBe("ja");
    expect(i18n.t("nav.home")).toBe("日本語ホーム");
    expect(i18n.t("explore.title")).toBe("Explore a scenario");
    expect(i18n.labelForPreset("standard-run", "Standard run")).toBe("Standard run");
  });

  test("switches to rtl locales and updates document direction", async () => {
    const i18n = createI18n({
      storage: makeStorage(),
      getNavigatorLanguages: () => ["en"],
      catalogLoader: async (locale) => ({
        "meta.title": "World3",
        "nav.home": locale === "ar" ? "الرئيسية" : "Home",
      }),
    });

    await i18n.setLocale("ar");

    expect(i18n.getDirection()).toBe("rtl");
    expect(document.documentElement.dir).toBe("rtl");
  });

  test("applies translated attributes and metadata label helpers", async () => {
    document.body.innerHTML = [
      '<button data-i18n="nav.home">Home</button>',
      '<a data-i18n="brand.home_aria" data-i18n-attr="aria-label"></a>',
    ].join("");
    const i18n = createI18n({
      storage: makeStorage(),
      getNavigatorLanguages: () => ["en"],
      catalogLoader: async () => ({
        "meta.title": "World3",
        "nav.home": "Accueil",
        "brand.home_aria": "Accueil World3",
        "preset.standard-run.name": "Exécution standard",
        "preset.standard-run.description": "Description locale",
        "variable.pop": "Population totale",
        "constant.ici": "Capital industriel initial",
        "sector.population": "Population",
        "confidence.high": "Élevée",
      }),
    });

    await i18n.setLocale("fr");
    i18n.applyDocument();

    expect(document.querySelector("[data-i18n='nav.home']")?.textContent).toBe("Accueil");
    expect(document.querySelector("[data-i18n='brand.home_aria']")?.getAttribute("aria-label")).toBe("Accueil World3");
    expect(i18n.labelForPreset("standard-run", "Standard run")).toBe("Exécution standard");
    expect(i18n.descriptionForPreset("standard-run", "")).toBe("Description locale");
    expect(i18n.labelForVariable("pop", "Population")).toBe("Population totale");
    expect(i18n.labelForConstant("ici", "Initial industrial capital")).toBe("Capital industriel initial");
    expect(i18n.labelForSector("Population", "Population")).toBe("Population");
    expect(i18n.labelForConfidence("high", "High")).toBe("Élevée");
    expect(i18n.getSupportedLocales().some((locale) => locale.code === "ar")).toBe(true);
  });

  test("returns fallback keys for missing message helpers", async () => {
    const i18n = createI18n({
      storage: makeStorage(),
      getNavigatorLanguages: () => ["en"],
      catalogLoader: async () => ({
        "meta.title": "World3",
      }),
    });

    await i18n.init();

    expect(i18n.t("missing.key")).toBe("missing.key");
    expect(i18n.t("missing.key", undefined, "Fallback")).toBe("Fallback");
    expect(i18n.labelForPreset("missing")).toBe("missing");
    expect(i18n.descriptionForPreset("missing")).toBe("");
    expect(i18n.labelForVariable("missing")).toBe("missing");
    expect(i18n.labelForConstant("missing")).toBe("missing");
    expect(i18n.labelForSector("Unknown")).toBe("Unknown");
    expect(i18n.labelForConfidence("unknown")).toBe("unknown");
  });

  test("handles storage failures and missing locale catalogs gracefully", async () => {
    const throwingStorage = {
      getItem() {
        throw new Error("no storage");
      },
      setItem() {
        throw new Error("no storage");
      },
      removeItem() {
        throw new Error("no storage");
      },
    };
    const i18n = createI18n({
      storage: throwingStorage,
      getNavigatorLanguages: () => ["es-MX"],
      catalogLoader: async (locale) => {
        if (locale === "en") {
          return {
            "meta.title": "World3",
            "nav.home": "Home",
          };
        }
        throw new Error("missing locale");
      },
    });

    await i18n.init();

    expect(i18n.getLocale()).toBe("auto");
    expect(i18n.getResolvedLocale()).toBe("es");
    expect(i18n.t("nav.home")).toBe("Home");
  });

  test("uses the default fetch-based loader when no custom loader is supplied", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.endsWith("/data/locales/en.json")) {
        return {
          ok: true,
          json: async () => ({
            "meta.title": "World3",
            "nav.home": "Home",
          }),
        } as Response;
      }
      if (url.endsWith("/data/locales/de.json")) {
        return {
          ok: true,
          json: async () => ({
            "nav.home": "Startseite",
          }),
        } as Response;
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response;
    });

    const i18n = createI18n({
      storage: makeStorage(),
      getNavigatorLanguages: () => ["de-DE"],
    });

    await i18n.init();
    expect(i18n.t("nav.home")).toBe("Startseite");
    expect(globalThis.fetch).toHaveBeenCalled();
    globalThis.fetch = originalFetch;
  });

  test("can return to auto locale after an explicit user choice", async () => {
    const storage = makeStorage();
    const i18n = createI18n({
      storage,
      getNavigatorLanguages: () => ["en-AU"],
      catalogLoader: async (locale) => ({
        "meta.title": "World3",
        "nav.home": locale === "ja" ? "ホーム" : "Home",
      }),
    });

    await i18n.setLocale("ja");
    expect(storage.values["world3.locale"]).toBe("ja");

    await i18n.setLocale("auto");
    expect(storage.values["world3.locale"]).toBeUndefined();
    expect(i18n.getLocale()).toBe("auto");
    expect(i18n.getResolvedLocale()).toBe("en");

    await i18n.setLocale("");
    expect(i18n.getLocale()).toBe("auto");
  });

  test("formats percentages and interpolates placeholders with fallback values", async () => {
    const i18n = createI18n({
      storage: makeStorage(),
      getNavigatorLanguages: () => ["de-DE"],
      catalogLoader: async (locale) => ({
        "meta.title": "World3",
        "advanced.slider_aria": locale === "de"
          ? "{name}-Regler {missing}"
          : "{name} slider {missing}",
      }),
    });

    await i18n.init();

    expect(i18n.t("advanced.slider_aria", { name: "Bevölkerung" })).toBe(
      "Bevölkerung-Regler {missing}",
    );
    expect(i18n.formatPercent(0.125, { maximumFractionDigits: 1 })).toBe("12,5 %");
  });

  test("falls back to navigator.language when navigator.languages is empty", async () => {
    const languagesSpy = vi.spyOn(window.navigator, "languages", "get").mockReturnValue([]);
    const languageSpy = vi.spyOn(window.navigator, "language", "get").mockReturnValue("ja-JP");
    const i18n = createI18n({
      storage: makeStorage(),
      catalogLoader: async (locale) => ({
        "meta.title": "World3",
        "nav.home": locale === "ja" ? "ホーム" : "Home",
      }),
    });

    await i18n.init();
    expect(i18n.getResolvedLocale()).toBe("ja");
    expect(i18n.t("nav.home")).toBe("ホーム");

    languagesSpy.mockRestore();
    languageSpy.mockRestore();
  });

  test("uses navigator.languages when available", async () => {
    const languagesSpy = vi.spyOn(window.navigator, "languages", "get").mockReturnValue(["de-DE"]);
    const i18n = createI18n({
      storage: makeStorage(),
      catalogLoader: async (locale) => ({
        "meta.title": "World3",
        "nav.home": locale === "de" ? "Startseite" : "Home",
      }),
    });

    await i18n.init();
    expect(i18n.getResolvedLocale()).toBe("de");
    languagesSpy.mockRestore();
  });

  test("defaults to english when navigator is unavailable", async () => {
    const originalNavigator = globalThis.navigator;
    vi.stubGlobal("navigator", undefined);
    const i18n = createI18n({
      storage: makeStorage(),
      catalogLoader: async () => ({
        "meta.title": "World3",
        "nav.home": "Home",
      }),
    });

    await i18n.init();
    expect(i18n.getResolvedLocale()).toBe("en");
    vi.stubGlobal("navigator", originalNavigator);
  });

  test("surfaces default catalog loader failures", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const i18n = createI18n({
      storage: makeStorage(),
      getNavigatorLanguages: () => ["en"],
    });

    await expect(i18n.init()).rejects.toThrow("Failed to load locale catalog");
    globalThis.fetch = originalFetch;
  });

  test("all locale catalogs match the english key set", () => {
    const localeDir = join(process.cwd(), "data/locales");
    const files = readdirSync(localeDir).filter((name) => name.endsWith(".json"));
    const english = JSON.parse(
      readFileSync(join(localeDir, "en.json"), "utf8"),
    ) as Record<string, string>;
    const englishKeys = Object.keys(english).sort();

    for (const file of files) {
      const catalog = JSON.parse(
        readFileSync(join(localeDir, file), "utf8"),
      ) as Record<string, string>;
      expect(Object.keys(catalog).sort(), file).toEqual(englishKeys);
    }
  });

  test("core index exports remain available", () => {
    expect(CoreIndex.createWorld3Core).toBeTypeOf("function");
    expect(CoreIndex.createValidationCore).toBeTypeOf("function");
    expect(CoreIndex.createCalibrationCore).toBeTypeOf("function");
    expect(CoreIndex.createRuntimeExecutionGraph).toBeTypeOf("function");
  });
});
