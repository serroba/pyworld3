/// <reference types="node" />

import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

import { ModelData } from "../model-data.js";
import {
  createWorld3Core,
} from "../core/index.js";
import type { RawLookupTable } from "../core/index.js";

const TABLES_PATH = new URL("../../data/functions-table-world3.json", import.meta.url);

function parseArgs(argv: string[]) {
  const options: {
    summary: boolean;
    json: boolean;
    plotSvg?: string;
    plotTerminal: boolean;
    preset: string;
    yearMin?: number;
    constants: Record<string, number>;
    listConstants: boolean;
  } = {
    summary: false,
    json: false,
    plotTerminal: false,
    preset: "standard-run",
    constants: {},
    listConstants: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") {
      options.summary = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--plot-svg") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for '--plot-svg'");
      }
      options.plotSvg = nextValue;
      index += 1;
      continue;
    }
    if (arg === "--plot-terminal" || arg === "--tui") {
      options.plotTerminal = true;
      continue;
    }
    if (arg === "--preset") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for '--preset'");
      }
      options.preset = nextValue;
      index += 1;
      continue;
    }
    if (arg === "--year-min") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for '--year-min'");
      }
      options.yearMin = Number(nextValue);
      index += 1;
      continue;
    }
    if (arg === "--set") {
      // --set key=value, e.g. --set nri=2e12 --set len=30
      const nextValue = argv[index + 1];
      if (!nextValue || !nextValue.includes("=")) {
        throw new Error("--set requires key=value, e.g. --set nri=2e12");
      }
      const [key, val] = nextValue.split("=");
      options.constants[key!] = Number(val);
      index += 1;
      continue;
    }
    if (arg === "--list-constants") {
      options.listConstants = true;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'`);
  }

  return options;
}

async function loadWorld3Tables(): Promise<RawLookupTable[]> {
  const raw = await readFile(TABLES_PATH, "utf8");
  return JSON.parse(raw) as RawLookupTable[];
}

/**
 * Render a simple ASCII chart of key World3 variables.
 * Each variable is normalized to [0, 1] and plotted on a shared canvas.
 */
function renderTerminalChart(
  time: number[],
  series: Record<string, { values: number[] }>,
  width = 80,
  height = 24,
): string {
  const VARS: { key: string; label: string; color: string }[] = [
    { key: "pop", label: "Population", color: "\x1b[31m" },    // red
    { key: "nrfr", label: "Resources", color: "\x1b[34m" },    // blue
    { key: "iopc", label: "Industry/cap", color: "\x1b[33m" }, // yellow
    { key: "fpc", label: "Food/cap", color: "\x1b[32m" },      // green
    { key: "ppolx", label: "Pollution", color: "\x1b[35m" },   // magenta
  ];
  const RESET = "\x1b[0m";

  const chartWidth = width - 12; // leave room for y-axis labels
  const chartHeight = height - 4; // leave room for x-axis and legend

  // Normalize each variable to [0, 1]
  const normalized: { key: string; values: number[] }[] = [];
  for (const v of VARS) {
    const vals = series[v.key]?.values;
    if (!vals) continue;
    const max = vals.reduce((a, b) => Math.max(a, b), 0) || 1;
    // Sample down to chartWidth points
    const sampled: number[] = [];
    for (let col = 0; col < chartWidth; col++) {
      const idx = Math.round((col / (chartWidth - 1)) * (vals.length - 1));
      sampled.push(vals[idx]! / max);
    }
    normalized.push({ key: v.key, values: sampled });
  }

  // Build the canvas grid
  const grid: string[][] = Array.from({ length: chartHeight }, () =>
    Array.from({ length: chartWidth }, () => " "),
  );

  // Plot each variable
  for (let vi = 0; vi < normalized.length; vi++) {
    const { values } = normalized[vi]!;
    const { color } = VARS[vi]!;
    for (let col = 0; col < chartWidth; col++) {
      const row = chartHeight - 1 - Math.round(values[col]! * (chartHeight - 1));
      const clampedRow = Math.max(0, Math.min(chartHeight - 1, row));
      // Use first char of label as marker
      const marker = VARS[vi]!.label[0]!;
      grid[clampedRow]![col] = `${color}${marker}${RESET}`;
    }
  }

  // Render
  const lines: string[] = [];
  lines.push("");
  lines.push("  World3 Simulation — Terminal View");
  lines.push(`  ${time[0]} to ${time[time.length - 1]}`);
  lines.push("");

  for (let row = 0; row < chartHeight; row++) {
    const yLabel = row === 0 ? "max" : row === chartHeight - 1 ? "  0" : "   ";
    lines.push(`${yLabel.padStart(4)} │${grid[row]!.join("")}│`);
  }

  // X-axis
  const startYear = String(time[0]);
  const endYear = String(time[time.length - 1]);
  const midYear = String(time[Math.floor(time.length / 2)]);
  const xAxis = `     └${"─".repeat(chartWidth)}┘`;
  lines.push(xAxis);

  const xLabels = `     ${startYear}${" ".repeat(Math.floor(chartWidth / 2) - startYear.length - Math.floor(midYear.length / 2))}${midYear}${" ".repeat(chartWidth - Math.floor(chartWidth / 2) - Math.ceil(midYear.length / 2) - endYear.length)}${endYear}`;
  lines.push(xLabels);

  // Legend
  lines.push("");
  const legend = VARS.map(v => `${v.color}${v.label[0]}${RESET} ${v.label}`).join("  ");
  lines.push(`  ${legend}`);
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const core = createWorld3Core(
    ModelData,
    loadWorld3Tables,
  );

  // List available constants and exit
  if (options.listConstants) {
    const meta = ModelData.constantMeta;
    const defaults = ModelData.constantDefaults;
    process.stdout.write("Available constants (name — description [default]):\n\n");
    for (const [key, info] of Object.entries(meta)) {
      const def = defaults[key as keyof typeof defaults] ?? "?";
      process.stdout.write(`  ${key.padEnd(12)} ${(info as { full_name: string }).full_name} [${def}]\n`);
    }
    return;
  }

  // Use the local simulation core which supports presets
  const simCore = core.createLocalSimulationCore();
  const overrides: Record<string, unknown> = {};
  if (options.yearMin != null) overrides.year_min = options.yearMin;
  // Merge user constant overrides
  if (Object.keys(options.constants).length > 0) {
    overrides.constants = options.constants;
    process.stderr.write(`Overrides: ${JSON.stringify(options.constants)}\n`);
  }
  const result = await simCore.simulatePreset(options.preset, overrides);

  if (options.summary) {
    const { formatSimulationSummary } = await import("../core/simulation-artifacts.js");
    process.stdout.write(`${formatSimulationSummary(result, ModelData)}\n`);
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }

  if (options.plotSvg) {
    const { renderSimulationSvg } = await import("../core/simulation-artifacts.js");
    await writeFile(options.plotSvg, renderSimulationSvg(result), "utf8");
    process.stderr.write(`Plot saved to ${options.plotSvg}\n`);
  }

  if (options.plotTerminal) {
    process.stderr.write(`Preset: ${options.preset}\n`);
    process.stdout.write(renderTerminalChart(result.time, result.series as Record<string, { values: number[] }>));
  }

  if (!options.summary && !options.json && !options.plotSvg && !options.plotTerminal) {
    const { formatSimulationSummary } = await import("../core/simulation-artifacts.js");
    process.stdout.write(`${formatSimulationSummary(result, ModelData)}\n`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
