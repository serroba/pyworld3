import { describe, expect, test } from "vitest";

import { parseArgs } from "../ts/cli/browser-native-cli.ts";

describe("CLI argument parsing", () => {
  test("defaults when no arguments provided", () => {
    const opts = parseArgs([]);
    expect(opts.summary).toBe(false);
    expect(opts.json).toBe(false);
    expect(opts.plotTerminal).toBe(false);
    expect(opts.preset).toBe("standard-run");
    expect(opts.yearMin).toBeUndefined();
    expect(opts.constants).toEqual({});
    expect(opts.listConstants).toBe(false);
    expect(opts.plotSvg).toBeUndefined();
  });

  test("--summary flag", () => {
    expect(parseArgs(["--summary"]).summary).toBe(true);
  });

  test("--json flag", () => {
    expect(parseArgs(["--json"]).json).toBe(true);
  });

  test("--plot-terminal flag", () => {
    expect(parseArgs(["--plot-terminal"]).plotTerminal).toBe(true);
  });

  test("--tui is an alias for --plot-terminal", () => {
    expect(parseArgs(["--tui"]).plotTerminal).toBe(true);
  });

  test("--plot-svg requires a path", () => {
    expect(() => parseArgs(["--plot-svg"])).toThrow("Missing value");
    expect(parseArgs(["--plot-svg", "/tmp/out.svg"]).plotSvg).toBe("/tmp/out.svg");
  });

  test("--preset selects a scenario", () => {
    expect(parseArgs(["--preset", "optimistic-technology"]).preset).toBe("optimistic-technology");
  });

  test("--preset requires a value", () => {
    expect(() => parseArgs(["--preset"])).toThrow("Missing value");
  });

  test("--year-min sets the start year", () => {
    expect(parseArgs(["--year-min", "2000"]).yearMin).toBe(2000);
  });

  test("--year-min requires a value", () => {
    expect(() => parseArgs(["--year-min"])).toThrow("Missing value");
  });

  test("--set parses key=value constant overrides", () => {
    const opts = parseArgs(["--set", "nri=2e12"]);
    expect(opts.constants).toEqual({ nri: 2e12 });
  });

  test("--set supports multiple overrides", () => {
    const opts = parseArgs(["--set", "nri=2e12", "--set", "dcfsn=2.0"]);
    expect(opts.constants).toEqual({ nri: 2e12, dcfsn: 2.0 });
  });

  test("--set requires key=value format", () => {
    expect(() => parseArgs(["--set"])).toThrow("key=value");
    expect(() => parseArgs(["--set", "nri"])).toThrow("key=value");
  });

  test("--list-constants flag", () => {
    expect(parseArgs(["--list-constants"]).listConstants).toBe(true);
  });

  test("unknown argument throws", () => {
    expect(() => parseArgs(["--bogus"])).toThrow("Unknown argument");
  });

  test("combined flags work together", () => {
    const opts = parseArgs([
      "--tui",
      "--preset", "comprehensive-policy",
      "--year-min", "1950",
      "--set", "nri=2e12",
      "--set", "dcfsn=2.0",
    ]);
    expect(opts.plotTerminal).toBe(true);
    expect(opts.preset).toBe("comprehensive-policy");
    expect(opts.yearMin).toBe(1950);
    expect(opts.constants).toEqual({ nri: 2e12, dcfsn: 2.0 });
  });
});

describe("CLI preset wiring", () => {
  test("simulation produces different results for different presets", async () => {
    const { ModelData } = await import("../ts/model-data.ts");
    const { createWorld3Core } = await import("../ts/core/index.ts");
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");

    const dir = dirname(fileURLToPath(import.meta.url));
    const tablesPath = join(dir, "..", "data", "functions-table-world3.json");

    const core = createWorld3Core(ModelData, async () => {
      const raw = JSON.parse(readFileSync(tablesPath, "utf8"));
      return raw;
    });
    const simCore = core.createLocalSimulationCore();

    const standard = await simCore.simulatePreset("standard-run");
    const comprehensive = await simCore.simulatePreset("comprehensive-policy");

    // Population at year 2100 should differ between presets
    const stdPop = standard.series.pop!.values;
    const compPop = comprehensive.series.pop!.values;
    expect(stdPop[stdPop.length - 1]).not.toBeCloseTo(compPop[compPop.length - 1]!, 0);
  });

  test("--set overrides produce different results from defaults", async () => {
    const { ModelData } = await import("../ts/model-data.ts");
    const { createWorld3Core } = await import("../ts/core/index.ts");
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");

    const dir = dirname(fileURLToPath(import.meta.url));
    const tablesPath = join(dir, "..", "data", "functions-table-world3.json");

    const core = createWorld3Core(ModelData, async () => {
      const raw = JSON.parse(readFileSync(tablesPath, "utf8"));
      return raw;
    });
    const simCore = core.createLocalSimulationCore();

    const standard = await simCore.simulatePreset("standard-run");
    const doubled = await simCore.simulatePreset("standard-run", { constants: { nri: 2e12 } });

    // Resources at year 2050 should be higher with doubled initial resources
    const stdNrfr = standard.series.nrfr!.values;
    const dblNrfr = doubled.series.nrfr!.values;
    // Pick a point around 2050 (index ~300 for 1900-2100 at dt=0.5)
    const midIdx = Math.floor(stdNrfr.length * 0.75);
    expect(dblNrfr[midIdx]).toBeGreaterThan(stdNrfr[midIdx]!);
  });
});
