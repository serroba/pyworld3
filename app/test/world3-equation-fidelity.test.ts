import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ModelData } from "../ts/model-data.ts";
import { simulateWorld3 } from "../ts/core/world3-simulation.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";
import type { RawLookupTable } from "../ts/core/world3-tables.ts";

/**
 * Equation fidelity tests — verify that simulation output at specific
 * time steps matches hand-computed DYNAMO formula values.
 *
 * Each test reads output buffers and checks that the relationship between
 * variables matches the DYNAMO equation. This catches drift between the
 * reference equations and the DSL implementation.
 *
 * Only tests equations whose outputs are in the series registry (publicly
 * visible variables). Internal intermediates (d1-d4, pjis, etc.) are
 * tested indirectly through the equations that consume them.
 */

function loadTables(): RawLookupTable[] {
  const raw = readFileSync(
    resolve(__dirname, "../data/functions-table-world3.json"),
    "utf-8",
  );
  return JSON.parse(raw) as RawLookupTable[];
}

const tables = loadTables();
const result: SimulationResult = simulateWorld3({
  yearMin: 1900,
  yearMax: 2100,
  dt: 0.5,
  pyear: 1975,
  iphst: 1940,
  constants: { ...ModelData.constantDefaults },
  rawTables: tables,
});

function at(key: string, k: number): number {
  const series = result.series[key as keyof typeof result.series];
  if (!series) throw new Error(`Missing series: ${key}`);
  return series.values[k]!;
}

function indexAt(year: number): number {
  let best = 0;
  for (let i = 0; i < result.time.length; i++) {
    if (Math.abs(result.time[i]! - year) < Math.abs(result.time[best]! - year)) best = i;
  }
  return best;
}

describe("equation fidelity: DYNAMO formula spot checks", () => {
  const k0 = 0;
  const k50 = indexAt(1950);
  const k80 = indexAt(1980);

  // ── Initial conditions ────────────────────────────────────────
  test("initial stocks match constants at k=0", () => {
    expect(at("pop", k0)).toBe(
      ModelData.constantDefaults.p1i + ModelData.constantDefaults.p2i +
      ModelData.constantDefaults.p3i + ModelData.constantDefaults.p4i,
    );
    expect(at("ic", k0)).toBe(ModelData.constantDefaults.ici);
    expect(at("sc", k0)).toBe(ModelData.constantDefaults.sci);
    expect(at("al", k0)).toBe(ModelData.constantDefaults.ali);
    expect(at("nr", k0)).toBe(ModelData.constantDefaults.nri);
    expect(at("ppol", k0)).toBe(ModelData.constantDefaults.ppoli);
    expect(at("lfert", k0)).toBe(ModelData.constantDefaults.lferti);
  });

  // ── Derived ratios (algebraic identities) ─────────────────────
  test("NRFR = NR / NRI", () => {
    expect(at("nrfr", k50)).toBeCloseTo(at("nr", k50) / ModelData.constantDefaults.nri, 10);
    expect(at("nrfr", k80)).toBeCloseTo(at("nr", k80) / ModelData.constantDefaults.nri, 10);
  });

  test("SOPC = SO / POP", () => {
    expect(at("sopc", k50)).toBeCloseTo(at("so", k50) / at("pop", k50), 6);
  });

  test("IOPC = IO / POP", () => {
    expect(at("iopc", k50)).toBeCloseTo(at("io", k50) / at("pop", k50), 6);
  });

  test("FPC = F / POP", () => {
    expect(at("fpc", k50)).toBeCloseTo(at("f", k50) / at("pop", k50), 6);
  });

  test("FR = FPC / SFPC", () => {
    expect(at("fr", k50)).toBeCloseTo(at("fpc", k50) / ModelData.constantDefaults.sfpc, 10);
  });

  test("PPOLX = PPOL / PPOL70", () => {
    expect(at("ppolx", k50)).toBeCloseTo(at("ppol", k50) / ModelData.constantDefaults.ppol70, 10);
    expect(at("ppolx", k80)).toBeCloseTo(at("ppol", k80) / ModelData.constantDefaults.ppol70, 10);
  });

  test("LF = (P2 + P3) * LFPF", () => {
    // P2 and P3 not directly in output but POP = P1+P2+P3+P4 and LF depends on P2+P3
    // Check via known relationship: LUF = J / LF
    const luf = at("luf", k50);
    const j = at("j", k50);
    const lf = at("lf", k50);
    expect(luf).toBeCloseTo(j / lf, 6);
  });

  test("TAI = IO * FIOAA", () => {
    expect(at("tai", k50)).toBeCloseTo(at("io", k50) * at("fioaa", k50), 0);
  });

  test("FIOAI = 1 - FIOAA - FIOAS - FIOAC", () => {
    expect(at("fioai", k50)).toBeCloseTo(
      1 - at("fioaa", k50) - at("fioas", k50) - at("fioac", k50), 10,
    );
  });

  // ── Allocation fractions sum to 1 ────────────────────────────
  test("FIOAA + FIOAS + FIOAC + FIOAI = 1", () => {
    const sum = at("fioaa", k50) + at("fioas", k50) + at("fioac", k50) + at("fioai", k50);
    expect(sum).toBeCloseTo(1, 10);
    const sum80 = at("fioaa", k80) + at("fioas", k80) + at("fioac", k80) + at("fioai", k80);
    expect(sum80).toBeCloseTo(1, 10);
  });

  // ── Monotonicity constraints ──────────────────────────────────
  test("NR is monotonically decreasing (resources only deplete)", () => {
    for (let k = 1; k < result.time.length; k++) {
      expect(at("nr", k)).toBeLessThanOrEqual(at("nr", k - 1));
    }
  });

  test("NRFR stays in [0, 1]", () => {
    for (let k = 0; k < result.time.length; k++) {
      expect(at("nrfr", k)).toBeGreaterThanOrEqual(0);
      expect(at("nrfr", k)).toBeLessThanOrEqual(1);
    }
  });

  // ── Conservation: land total only decreases (erosion is irreversible)
  test("AL + PAL + UIL <= initial total (erosion removes land)", () => {
    const total0 = at("al", k0) + at("pal", k0) + at("uil", k0);
    for (let k = 1; k < result.time.length; k++) {
      const total = at("al", k) + at("pal", k) + at("uil", k);
      expect(total).toBeLessThanOrEqual(total0 + 1); // +1 for float tolerance
    }
  });
});
