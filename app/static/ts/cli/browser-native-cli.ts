/// <reference types="node" />

import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

import { ModelData } from "../model-data.js";
import {
  createFixtureBackedRuntime,
  formatSimulationSummary,
  renderSimulationSvg,
} from "../core/index.js";
import type { RawLookupTable } from "../core/index.js";
import type { SimulationResult } from "../simulation-contracts.js";

const FIXTURE_PATH = new URL("../../data/standard-run-explore.json", import.meta.url);
const TABLES_PATH = new URL("../../data/functions-table-world3.json", import.meta.url);

function parseArgs(argv: string[]) {
  const options: {
    summary: boolean;
    json: boolean;
    plotSvg?: string;
    preset: string;
  } = {
    summary: false,
    json: false,
    preset: "standard-run",
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
    if (arg === "--preset") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("Missing value for '--preset'");
      }
      options.preset = nextValue;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument '${arg}'`);
  }

  return options;
}

async function loadStandardRunFixture(): Promise<SimulationResult> {
  const raw = await readFile(FIXTURE_PATH, "utf8");
  return JSON.parse(raw) as SimulationResult;
}

async function loadWorld3Tables(): Promise<RawLookupTable[]> {
  const raw = await readFile(TABLES_PATH, "utf8");
  return JSON.parse(raw) as RawLookupTable[];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runtime = createFixtureBackedRuntime(
    ModelData,
    loadWorld3Tables,
    loadStandardRunFixture,
  );
  await runtime.prepareStandardRun();
  const result = await runtime.simulateStandardRun();

  if (options.summary) {
    process.stdout.write(`${formatSimulationSummary(result, ModelData)}\n`);
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }

  if (options.plotSvg) {
    await writeFile(options.plotSvg, renderSimulationSvg(result), "utf8");
    process.stderr.write(`Plot saved to ${options.plotSvg}\n`);
  }

  if (!options.summary && !options.json && !options.plotSvg) {
    process.stdout.write(
      `${formatSimulationSummary(result, ModelData)}\n`,
    );
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
