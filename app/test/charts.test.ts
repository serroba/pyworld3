import { describe, expect, test, vi, beforeEach } from "vitest";

// Mock globals before importing charts module
const mockI18n = {
  t: vi.fn((key: string, _params?: unknown, fallback?: string) => fallback ?? key),
  formatNumber: vi.fn((v: number) => String(v)),
  getDirection: vi.fn(() => "ltr"),
};

Object.defineProperty(globalThis, "I18n", { value: mockI18n, writable: true });
Object.defineProperty(globalThis, "State", {
  value: {
    variableMeta: {
      pop: { full_name: "Total population", unit: "people" },
      le: { full_name: "Life expectancy", unit: "years" },
    },
  },
  writable: true,
});
Object.defineProperty(globalThis, "UI", {
  value: {
    formatNumber: vi.fn((v: number) => String(v)),
    labelVariable: vi.fn((key: string, fallback: string) => fallback),
  },
  writable: true,
});
Object.defineProperty(globalThis, "Chart", {
  value: {
    register: vi.fn(),
    defaults: { color: "", borderColor: "", plugins: { legend: { labels: {} } } },
    instances: {},
    getChart: vi.fn(() => null),
  },
  writable: true,
});

const { buildAnnotations, translateUnit } = await import("../ts/charts.ts");

describe("charts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default I18n.t mock — returns fallback
    mockI18n.t.mockImplementation(
      (_key: string, _params?: unknown, fallback?: string) => fallback ?? _key,
    );
  });

  describe("translateUnit", () => {
    test("translates known unit strings via i18n", () => {
      mockI18n.t.mockImplementation(
        (_key: string, _params?: unknown, fallback?: string) => `translated:${fallback}`,
      );
      const result = translateUnit("people");
      expect(mockI18n.t).toHaveBeenCalledWith("unit.people", {}, "people");
      expect(result).toBe("translated:people");
    });

    test("returns raw string for unknown units", () => {
      expect(translateUnit("custom-unit")).toBe("custom-unit");
    });

    test("returns empty string for empty or dash input", () => {
      expect(translateUnit("")).toBe("");
      expect(translateUnit("-")).toBe("");
    });

    test("maps all known unit strings to i18n keys", () => {
      const knownUnits = [
        "people", "years", "resource units", "pollution units",
        "births/1000/yr", "deaths/1000/yr", "$/person/yr",
        "kg/person/yr", "$/yr", "$/ha/yr", "kg/yr", "kg/ha/yr", "ha",
      ];
      for (const unit of knownUnits) {
        mockI18n.t.mockClear();
        translateUnit(unit);
        expect(mockI18n.t).toHaveBeenCalledTimes(1);
        const callKey = mockI18n.t.mock.calls[0]![0] as string;
        expect(callKey).toMatch(/^unit\./);
      }
    });
  });

  describe("buildAnnotations", () => {
    test("always includes a Now line at the current year", () => {
      const result = buildAnnotations({ currentYear: 2026 });
      expect(result.lines.length).toBeGreaterThanOrEqual(1);
      const nowLine = result.lines.find((l) => l.label === "Now");
      expect(nowLine).toBeDefined();
      expect(nowLine!.year).toBe(2026);
      expect(nowLine!.dash).toEqual([3, 3]);
    });

    test("defaults currentYear to system clock", () => {
      const result = buildAnnotations();
      const nowLine = result.lines.find((l) => l.label === "Now");
      expect(nowLine!.year).toBe(new Date().getFullYear());
    });

    test("includes policy line when divergeYear is set", () => {
      const result = buildAnnotations({ divergeYear: 1972, currentYear: 2026 });
      expect(result.lines.length).toBe(2);
      const policyLine = result.lines.find((l) => l.label === "Policy");
      expect(policyLine).toBeDefined();
      expect(policyLine!.year).toBe(1972);
      expect(policyLine!.dash).toEqual([6, 3]);
    });

    test("includes policy line when policyYear is set", () => {
      const result = buildAnnotations({ policyYear: 2004 });
      const policyLine = result.lines.find((l) => l.label === "Policy");
      expect(policyLine).toBeDefined();
      expect(policyLine!.year).toBe(2004);
    });

    test("divergeYear takes precedence over policyYear", () => {
      const result = buildAnnotations({ divergeYear: 1972, policyYear: 2004 });
      const policyLine = result.lines.find((l) => l.label === "Policy");
      expect(policyLine!.year).toBe(1972);
    });

    test("does not add policy line when it equals current year", () => {
      const result = buildAnnotations({ divergeYear: 2026, currentYear: 2026 });
      expect(result.lines.length).toBe(1);
    });

    test("does not add policy line when no options given", () => {
      const result = buildAnnotations();
      expect(result.lines.length).toBe(1);
    });

    test("all lines have color and dash properties", () => {
      const result = buildAnnotations({ divergeYear: 1972 });
      for (const line of result.lines) {
        expect(typeof line.color).toBe("string");
        expect(line.color!.length).toBeGreaterThan(0);
        expect(Array.isArray(line.dash)).toBe(true);
      }
    });

    test("now and policy lines have different colors", () => {
      const result = buildAnnotations({ divergeYear: 1972 });
      const nowLine = result.lines.find((l) => l.label === "Now");
      const policyLine = result.lines.find((l) => l.label === "Policy");
      expect(nowLine!.color).not.toBe(policyLine!.color);
    });
  });

  describe("preset policy detection", () => {
    // Mirror of the POLICY_SWITCH_KEYS set used in explore.js
    const POLICY_SWITCH_KEYS = new Set([
      "icor2", "nruf2", "lyf2", "ppgf2", "alai2", "pptd2",
      "alic2", "alsc2", "scor2", "fioac2",
      "dcfsn", "pet", "zpgt",
    ]);

    function hasPolicySwitch(constants: Record<string, unknown>): boolean {
      return Object.keys(constants).some((k) => POLICY_SWITCH_KEYS.has(k));
    }

    test("comprehensive-policy has policy-switch constants", async () => {
      const { ModelData } = await import("../ts/core/model-data.ts");
      const preset = ModelData.presets.find((p: { name: string }) => p.name === "comprehensive-policy");
      expect(hasPolicySwitch(preset!.constants)).toBe(true);
    });

    test("optimistic-technology has policy-switch constants", async () => {
      const { ModelData } = await import("../ts/core/model-data.ts");
      const preset = ModelData.presets.find((p: { name: string }) => p.name === "optimistic-technology");
      expect(hasPolicySwitch(preset!.constants)).toBe(true);
    });

    test("population-stability has policy-switch constants", async () => {
      const { ModelData } = await import("../ts/core/model-data.ts");
      const preset = ModelData.presets.find((p: { name: string }) => p.name === "population-stability");
      expect(hasPolicySwitch(preset!.constants)).toBe(true);
    });

    test("standard-run has no policy-switch constants", async () => {
      const { ModelData } = await import("../ts/core/model-data.ts");
      const preset = ModelData.presets.find((p: { name: string }) => p.name === "standard-run");
      expect(hasPolicySwitch(preset!.constants)).toBe(false);
    });

    test("doubled-resources has no policy-switch constants", async () => {
      const { ModelData } = await import("../ts/core/model-data.ts");
      const preset = ModelData.presets.find((p: { name: string }) => p.name === "doubled-resources");
      expect(hasPolicySwitch(preset!.constants)).toBe(false);
    });

    test("recalibration-2023 has no policy-switch constants", async () => {
      const { ModelData } = await import("../ts/core/model-data.ts");
      const preset = ModelData.presets.find((p: { name: string }) => p.name === "recalibration-2023");
      expect(hasPolicySwitch(preset!.constants)).toBe(false);
    });
  });
});
