/// <reference types="node" />
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { ModelData } from "../model-data.js";
import { createWorld3Core, } from "../core/index.js";
const TABLES_PATH = new URL("../../data/functions-table-world3.json", import.meta.url);
function parseArgs(argv) {
    const options = {
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
async function loadWorld3Tables() {
    const raw = await readFile(TABLES_PATH, "utf8");
    return JSON.parse(raw);
}
async function main() {
    const options = parseArgs(process.argv.slice(2));
    const core = createWorld3Core(ModelData, loadWorld3Tables);
    const result = await core.simulateStandardRun();
    if (options.summary) {
        process.stdout.write(`${await core.summarizeStandardRun()}\n`);
    }
    if (options.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    }
    if (options.plotSvg) {
        await writeFile(options.plotSvg, await core.renderStandardRunSvg(), "utf8");
        process.stderr.write(`Plot saved to ${options.plotSvg}\n`);
    }
    if (!options.summary && !options.json && !options.plotSvg) {
        process.stdout.write(`${await core.summarizeStandardRun()}\n`);
    }
}
main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    process.exitCode = 1;
});
