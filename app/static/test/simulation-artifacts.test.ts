import { describe, expect, test } from "vitest";

import { ModelData } from "../ts/model-data.ts";
import {
  formatSimulationSummary,
  renderSimulationSvg,
} from "../ts/core/simulation-artifacts.ts";
import type { SimulationResult } from "../ts/simulation-contracts.ts";

const fixture: SimulationResult = {
  year_min: 1900,
  year_max: 1901,
  dt: 0.5,
  time: [1900, 1900.5, 1901],
  constants_used: {},
  series: {
    pop: { name: "pop", values: [100, 120, 140] },
    nr: { name: "nr", values: [10, 8, 6] },
    iopc: { name: "iopc", values: [1, 1.5, 2] },
    fpc: { name: "fpc", values: [3, 3.2, 3.4] },
    ppolx: { name: "ppolx", values: [0.1, 0.2, 0.4] },
  },
};

describe("simulation artifacts", () => {
  test("formats a grouped summary", () => {
    const summary = formatSimulationSummary(fixture, ModelData);

    expect(summary).toContain("World3 Simulation Summary (1900-1901, dt=0.5)");
    expect(summary).toContain("Population");
    expect(summary).toContain("Resources");
    expect(summary).toContain("rising");
  });

  test("renders an SVG plot for the key variables", () => {
    const svg = renderSimulationSvg(fixture);

    expect(svg).toContain("<svg");
    expect(svg).toContain("World3 Simulation — Key Variables");
    expect(svg).toContain("Population");
    expect(svg).toContain("#2196F3");
    expect(svg).toContain("Normalized value");
  });

  test("groups unknown variables under Other and skips empty series", () => {
    const summary = formatSimulationSummary(
      {
        ...fixture,
        series: {
          custom_metric: { name: "custom_metric", values: [5, 5, 5] },
          empty: { name: "empty", values: [] },
        },
      } as unknown as SimulationResult,
      ModelData,
    );

    expect(summary).toContain("Other");
    expect(summary).toContain("custom_metric");
    expect(summary).toContain("stable");
    expect(summary).not.toContain("empty");
  });

  test("skips malformed series entries with missing first or last values", () => {
    const summary = formatSimulationSummary(
      {
        ...fixture,
        series: {
          malformed_start: { name: "malformed_start", values: [undefined as unknown as number, 5] },
          malformed_end: { name: "malformed_end", values: [5, undefined as unknown as number] },
        },
      } as unknown as SimulationResult,
      ModelData,
    );

    expect(summary).not.toContain("malformed_start");
    expect(summary).not.toContain("malformed_end");
  });

  test("renders sparse series with fallback years and compact dt formatting", () => {
    const sparse = {
      ...fixture,
      dt: 1_500,
      time: [],
      series: {
        pop: { name: "pop", values: [100] },
      },
    } satisfies SimulationResult;

    const svg = renderSimulationSvg(sparse);

    expect(svg).toContain("1900 to 1901");
    expect(svg).toContain("dt 1.50K");
    expect(svg).toContain("Population");
  });

  test("supports larger compact dt units in SVG headers", () => {
    const inMillions = renderSimulationSvg({ ...fixture, dt: 2_000_000 });
    const inBillions = renderSimulationSvg({ ...fixture, dt: 3_000_000_000 });
    const inTrillions = renderSimulationSvg({ ...fixture, dt: 4_000_000_000_000 });

    expect(inMillions).toContain("dt 2.00M");
    expect(inBillions).toContain("dt 3.00B");
    expect(inTrillions).toContain("dt 4.00T");
  });

  test("omits legend entries and paths for missing plotted series", () => {
    const svg = renderSimulationSvg({
      ...fixture,
      series: {
        pop: fixture.series.pop!,
      },
    });

    expect(svg).toContain("Population");
    expect(svg).not.toContain("Resources");
    expect(svg).not.toContain("Industrial output/cap");
  });
});
