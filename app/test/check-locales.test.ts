import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const LOCALES_DIR = resolve(__dirname, "../data/locales");

function loadLocale(file: string): Record<string, string> {
  return JSON.parse(readFileSync(resolve(LOCALES_DIR, file), "utf8"));
}

function localeFiles(): string[] {
  return readdirSync(LOCALES_DIR).filter((f) => f.endsWith(".json")).sort();
}

describe("locale completeness", () => {
  const files = localeFiles();
  const enKeys = Object.keys(loadLocale("en.json")).sort();

  test("en.json exists and has keys", () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  test("all locales have the same number of files", () => {
    expect(files.length).toBe(22);
  });

  for (const file of files) {
    if (file === "en.json") continue;

    test(`${file} has all keys from en.json`, () => {
      const keys = new Set(Object.keys(loadLocale(file)));
      const missing = enKeys.filter((k) => !keys.has(k));
      expect(missing, `Missing keys in ${file}`).toEqual([]);
    });

    test(`${file} has no extra keys beyond en.json`, () => {
      const enSet = new Set(enKeys);
      const keys = Object.keys(loadLocale(file));
      const extra = keys.filter((k) => !enSet.has(k));
      expect(extra, `Extra keys in ${file}`).toEqual([]);
    });
  }

  test("all locale values are non-empty strings", () => {
    for (const file of files) {
      const data = loadLocale(file);
      for (const [key, value] of Object.entries(data)) {
        expect(typeof value, `${file}:${key} type`).toBe("string");
        expect(value.trim().length, `${file}:${key} is empty`).toBeGreaterThan(0);
      }
    }
  });

});
