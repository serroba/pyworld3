import type { TimeSeriesResult } from "../simulation-contracts.js";
import type { World3SimulationBuffers } from "./world3-simulation-sectors.js";

export type World3SectorName =
  | "Population"
  | "Capital"
  | "Agriculture"
  | "Pollution"
  | "Resources"
  | "Cross-sector";

export type World3SeriesKind = "stock" | "flow" | "auxiliary";

export type World3SeriesDefinition = {
  key: keyof World3SimulationBuffers;
  fullName: string;
  sector: World3SectorName;
  unit: string;
  kind: World3SeriesKind;
  defaultOutput?: boolean;
  compareMetricLabel?: string;
  simulationPlotLabel?: string;
};

export type World3ConstantDefinition = {
  key: string;
  fullName: string;
  sector: Exclude<World3SectorName, "Cross-sector">;
  unit: string;
};

export const WORLD3_SERIES_REGISTRY: ReadonlyArray<World3SeriesDefinition> = [
  { key: "pop", fullName: "Total population", sector: "Population", unit: "people", kind: "stock", defaultOutput: true, compareMetricLabel: "Population", simulationPlotLabel: "Population" },
  { key: "le", fullName: "Life expectancy", sector: "Population", unit: "years", kind: "auxiliary", defaultOutput: true, compareMetricLabel: "Life expectancy" },
  { key: "iopc", fullName: "Industrial output per capita", sector: "Capital", unit: "$/person/yr", kind: "auxiliary", defaultOutput: true, compareMetricLabel: "Industrial output/cap", simulationPlotLabel: "Industrial output/cap" },
  { key: "fpc", fullName: "Food per capita", sector: "Agriculture", unit: "kg/person/yr", kind: "auxiliary", defaultOutput: true, compareMetricLabel: "Food/capita", simulationPlotLabel: "Food/capita" },
  { key: "ppolx", fullName: "Pollution index", sector: "Pollution", unit: "-", kind: "auxiliary", defaultOutput: true, compareMetricLabel: "Pollution index", simulationPlotLabel: "Pollution index" },
  { key: "nrfr", fullName: "Nonrenewable resource fraction remaining", sector: "Resources", unit: "-", kind: "auxiliary", defaultOutput: true, compareMetricLabel: "Resources remaining", simulationPlotLabel: "Resources" },
  { key: "p1", fullName: "Population ages 0-14", sector: "Population", unit: "people", kind: "stock" },
  { key: "p2", fullName: "Population ages 15-44", sector: "Population", unit: "people", kind: "stock" },
  { key: "p3", fullName: "Population ages 45-64", sector: "Population", unit: "people", kind: "stock" },
  { key: "p4", fullName: "Population ages 65+", sector: "Population", unit: "people", kind: "stock" },
  { key: "b", fullName: "Births per year", sector: "Population", unit: "people/yr", kind: "flow" },
  { key: "d", fullName: "Deaths per year", sector: "Population", unit: "people/yr", kind: "flow" },
  { key: "cbr", fullName: "Crude birth rate", sector: "Population", unit: "births/1000/yr", kind: "auxiliary" },
  { key: "cdr", fullName: "Crude death rate", sector: "Population", unit: "deaths/1000/yr", kind: "auxiliary" },
  { key: "ic", fullName: "Industrial capital", sector: "Capital", unit: "$", kind: "stock" },
  { key: "sc", fullName: "Service capital", sector: "Capital", unit: "$", kind: "stock" },
  { key: "io", fullName: "Industrial output", sector: "Capital", unit: "$/yr", kind: "flow" },
  { key: "so", fullName: "Service output", sector: "Capital", unit: "$/yr", kind: "flow" },
  { key: "sopc", fullName: "Service output per capita", sector: "Capital", unit: "$/person/yr", kind: "auxiliary" },
  { key: "al", fullName: "Arable land", sector: "Agriculture", unit: "ha", kind: "stock", defaultOutput: true },
  { key: "pal", fullName: "Potentially arable land", sector: "Agriculture", unit: "ha", kind: "stock" },
  { key: "uil", fullName: "Urban-industrial land", sector: "Agriculture", unit: "ha", kind: "stock" },
  { key: "lfert", fullName: "Land fertility", sector: "Agriculture", unit: "kg/ha/yr", kind: "stock" },
  { key: "ly", fullName: "Land yield", sector: "Agriculture", unit: "kg/ha/yr", kind: "auxiliary", defaultOutput: true },
  { key: "f", fullName: "Total food production", sector: "Agriculture", unit: "kg/yr", kind: "flow", defaultOutput: true },
  { key: "ai", fullName: "Agricultural inputs", sector: "Agriculture", unit: "$/yr", kind: "flow" },
  { key: "pfr", fullName: "Perceived food ratio", sector: "Agriculture", unit: "-", kind: "auxiliary" },
  { key: "ppol", fullName: "Persistent pollution", sector: "Pollution", unit: "pollution units", kind: "stock", defaultOutput: true },
  { key: "nr", fullName: "Nonrenewable resources remaining", sector: "Resources", unit: "resource units", kind: "stock", defaultOutput: true },
  { key: "nrur", fullName: "Nonrenewable resource usage rate", sector: "Resources", unit: "resource units/yr", kind: "flow" },
  { key: "fioai", fullName: "Fraction industrial output for industry", sector: "Capital", unit: "-", kind: "auxiliary" },
  { key: "fioaa", fullName: "Fraction industrial output for agriculture", sector: "Capital", unit: "-", kind: "auxiliary", defaultOutput: true },
  { key: "tai", fullName: "Total agricultural investment", sector: "Agriculture", unit: "$/yr", kind: "flow", defaultOutput: true },
  { key: "fioas", fullName: "Fraction industrial output for services", sector: "Capital", unit: "-", kind: "auxiliary" },
  { key: "fioac", fullName: "Fraction industrial output for consumption", sector: "Capital", unit: "-", kind: "auxiliary" },
  { key: "lf", fullName: "Labor force", sector: "Population", unit: "people", kind: "auxiliary" },
  { key: "j", fullName: "Jobs", sector: "Capital", unit: "jobs", kind: "auxiliary" },
  { key: "cuf", fullName: "Capital utilization fraction", sector: "Capital", unit: "-", kind: "auxiliary" },
  { key: "luf", fullName: "Labor utilization fraction", sector: "Capital", unit: "-", kind: "auxiliary" },
  { key: "fpu", fullName: "Food potential utilization", sector: "Population", unit: "-", kind: "auxiliary" },
  { key: "lmhs", fullName: "Lifetime multiplier from health services", sector: "Population", unit: "-", kind: "auxiliary" },
  { key: "lmc", fullName: "Lifetime multiplier from crowding", sector: "Population", unit: "-", kind: "auxiliary" },
  { key: "hsapc", fullName: "Health services per capita", sector: "Capital", unit: "$/person/yr", kind: "auxiliary" },
  { key: "fcaor", fullName: "Fraction capital allocated to obtaining resources", sector: "Resources", unit: "-", kind: "auxiliary" },
  { key: "lymap", fullName: "Land yield multiplier from air pollution", sector: "Agriculture", unit: "-", kind: "auxiliary" },
  { key: "tf", fullName: "Total fertility", sector: "Population", unit: "children", kind: "auxiliary" },
  { key: "mtf", fullName: "Maximum total fertility", sector: "Population", unit: "children", kind: "auxiliary" },
  { key: "dtf", fullName: "Desired total fertility", sector: "Population", unit: "children", kind: "auxiliary" },
  { key: "dcfs", fullName: "Desired completed family size", sector: "Population", unit: "children", kind: "auxiliary" },
  { key: "cmple", fullName: "Compensatory multiplier from perceived life expectancy", sector: "Population", unit: "-", kind: "auxiliary" },
  { key: "sfsn", fullName: "Social family size norm", sector: "Population", unit: "-", kind: "auxiliary" },
  { key: "fcapc", fullName: "Food coefficient from affluence per capita", sector: "Agriculture", unit: "-", kind: "auxiliary" },
  { key: "fce", fullName: "Fertility control effectiveness", sector: "Population", unit: "-", kind: "auxiliary" },
  { key: "fr", fullName: "Food ratio", sector: "Agriculture", unit: "-", kind: "auxiliary" },
  { key: "falm", fullName: "Fraction of inputs allocated to land maintenance", sector: "Agriculture", unit: "-", kind: "auxiliary" },
  { key: "aiph", fullName: "Agricultural inputs per hectare", sector: "Agriculture", unit: "$/ha/yr", kind: "auxiliary", defaultOutput: true },
  { key: "ler", fullName: "Land erosion rate", sector: "Agriculture", unit: "ha/yr", kind: "flow" },
  { key: "ldr", fullName: "Land development rate", sector: "Agriculture", unit: "ha/yr", kind: "flow" },
  { key: "lrui", fullName: "Land removal for urban-industrial use", sector: "Agriculture", unit: "ha/yr", kind: "flow" },
  { key: "ppapr", fullName: "Persistent pollution appearance rate", sector: "Pollution", unit: "pollution units/yr", kind: "flow" },
  { key: "ppasr", fullName: "Persistent pollution assimilation rate", sector: "Pollution", unit: "pollution units/yr", kind: "flow" },
] satisfies readonly World3SeriesDefinition[];

export const WORLD3_CONSTANT_REGISTRY: ReadonlyArray<World3ConstantDefinition> = [
  { key: "ahl70", fullName: "Assimilation half-life in 1970", sector: "Pollution", unit: "years" },
  { key: "alai1", fullName: "Avg lifetime agricultural input 1", sector: "Agriculture", unit: "years" },
  { key: "alai2", fullName: "Avg lifetime agricultural input 2", sector: "Agriculture", unit: "years" },
  { key: "ali", fullName: "Initial arable land", sector: "Agriculture", unit: "ha" },
  { key: "alic1", fullName: "Avg lifetime industrial capital 1", sector: "Capital", unit: "years" },
  { key: "alic2", fullName: "Avg lifetime industrial capital 2", sector: "Capital", unit: "years" },
  { key: "alln", fullName: "Average life of land normal", sector: "Agriculture", unit: "years" },
  { key: "alsc1", fullName: "Avg lifetime service capital 1", sector: "Capital", unit: "years" },
  { key: "alsc2", fullName: "Avg lifetime service capital 2", sector: "Capital", unit: "years" },
  { key: "amti", fullName: "Agricultural material toxicity index", sector: "Pollution", unit: "-" },
  { key: "dcfsn", fullName: "Desired completed family size normal", sector: "Population", unit: "children" },
  { key: "fcest", fullName: "Fertility control effectiveness set time", sector: "Population", unit: "year" },
  { key: "fioac1", fullName: "Fraction industrial output for consumption 1", sector: "Capital", unit: "-" },
  { key: "fioac2", fullName: "Fraction industrial output for consumption 2", sector: "Capital", unit: "-" },
  { key: "fipm", fullName: "Fraction industrial pollution manageable", sector: "Pollution", unit: "-" },
  { key: "frpm", fullName: "Fraction resources as pollution material", sector: "Pollution", unit: "-" },
  { key: "fspd", fullName: "Food shortage perception delay", sector: "Agriculture", unit: "years" },
  { key: "hsid", fullName: "Health services impact delay", sector: "Population", unit: "years" },
  { key: "ici", fullName: "Initial industrial capital", sector: "Capital", unit: "$" },
  { key: "icor1", fullName: "Industrial capital-output ratio 1", sector: "Capital", unit: "years" },
  { key: "icor2", fullName: "Industrial capital-output ratio 2", sector: "Capital", unit: "years" },
  { key: "ieat", fullName: "Income expectation averaging time", sector: "Population", unit: "years" },
  { key: "iet", fullName: "Industrial equilibrium time", sector: "Capital", unit: "year" },
  { key: "ilf", fullName: "Inherent land fertility", sector: "Agriculture", unit: "kg/ha/yr" },
  { key: "imef", fullName: "Industrial material emission factor", sector: "Pollution", unit: "-" },
  { key: "imti", fullName: "Industrial material toxicity index", sector: "Pollution", unit: "-" },
  { key: "io70", fullName: "Industrial output in 1970", sector: "Agriculture", unit: "$/yr" },
  { key: "iopcd", fullName: "Industrial output per capita desired", sector: "Capital", unit: "$/person/yr" },
  { key: "len", fullName: "Life expectancy normal", sector: "Population", unit: "years" },
  { key: "lferti", fullName: "Initial land fertility", sector: "Agriculture", unit: "kg/ha/yr" },
  { key: "lfh", fullName: "Land fraction harvested", sector: "Agriculture", unit: "-" },
  { key: "lfpf", fullName: "Labor force participation fraction", sector: "Capital", unit: "-" },
  { key: "lpd", fullName: "Lifetime perception delay", sector: "Population", unit: "years" },
  { key: "lufdt", fullName: "Labor utilization fraction delay time", sector: "Capital", unit: "years" },
  { key: "lyf1", fullName: "Land yield factor 1", sector: "Agriculture", unit: "-" },
  { key: "lyf2", fullName: "Land yield factor 2", sector: "Agriculture", unit: "-" },
  { key: "mtfn", fullName: "Maximum total fertility normal", sector: "Population", unit: "children" },
  { key: "nri", fullName: "Initial nonrenewable resources", sector: "Resources", unit: "resource units" },
  { key: "nruf1", fullName: "Nonrenewable resource usage factor 1", sector: "Resources", unit: "-" },
  { key: "nruf2", fullName: "Nonrenewable resource usage factor 2", sector: "Resources", unit: "-" },
  { key: "p1i", fullName: "Initial population 0-14", sector: "Population", unit: "people" },
  { key: "p2i", fullName: "Initial population 15-44", sector: "Population", unit: "people" },
  { key: "p3i", fullName: "Initial population 45-64", sector: "Population", unit: "people" },
  { key: "p4i", fullName: "Initial population 65+", sector: "Population", unit: "people" },
  { key: "pali", fullName: "Initial potentially arable land", sector: "Agriculture", unit: "ha" },
  { key: "palt", fullName: "Potentially arable land total", sector: "Agriculture", unit: "ha" },
  { key: "pet", fullName: "Population equilibrium time", sector: "Population", unit: "year" },
  { key: "pl", fullName: "Processing loss", sector: "Agriculture", unit: "-" },
  { key: "ppgf1", fullName: "Persistent pollution gen factor 1", sector: "Pollution", unit: "-" },
  { key: "ppgf2", fullName: "Persistent pollution gen factor 2", sector: "Pollution", unit: "-" },
  { key: "ppgf21", fullName: "Persistent pollution gen factor 2 (post-policy)", sector: "Pollution", unit: "-" },
  { key: "pyear", fullName: "Policy implementation year", sector: "Capital", unit: "year" },
  { key: "ppol70", fullName: "Pollution level in 1970", sector: "Pollution", unit: "pollution units" },
  { key: "ppoli", fullName: "Initial persistent pollution", sector: "Pollution", unit: "pollution units" },
  { key: "pptd1", fullName: "Pollution transmission delay 1", sector: "Pollution", unit: "years" },
  { key: "pptd2", fullName: "Pollution transmission delay 2", sector: "Pollution", unit: "years" },
  { key: "rlt", fullName: "Reproductive lifetime", sector: "Population", unit: "years" },
  { key: "sad", fullName: "Social adjustment delay", sector: "Population", unit: "years" },
  { key: "sci", fullName: "Initial service capital", sector: "Capital", unit: "$" },
  { key: "scor1", fullName: "Service capital-output ratio 1", sector: "Capital", unit: "years" },
  { key: "scor2", fullName: "Service capital-output ratio 2", sector: "Capital", unit: "years" },
  { key: "sd", fullName: "Social discount", sector: "Agriculture", unit: "-" },
  { key: "sfpc", fullName: "Subsistence food per capita", sector: "Agriculture", unit: "kg/yr" },
  { key: "uildt", fullName: "Urban-industrial land development time", sector: "Agriculture", unit: "years" },
  { key: "uili", fullName: "Initial urban-industrial land", sector: "Agriculture", unit: "ha" },
  { key: "zpgt", fullName: "Zero population growth time", sector: "Population", unit: "year" },
] satisfies readonly World3ConstantDefinition[];

const SERIES_BY_KEY = new Map(
  WORLD3_SERIES_REGISTRY.map((definition) => [definition.key, definition] as const),
);

export const WORLD3_DEFAULT_VARIABLES: ReadonlyArray<keyof World3SimulationBuffers> = [
  "pop",
  "nr",
  "nrfr",
  "io",
  "iopc",
  "fpc",
  "f",
  "so",
  "sopc",
  "ppolx",
  "ppol",
  "al",
  "ly",
  "le",
  "cbr",
  "cdr",
  "fioaa",
  "fcaor",
  "tai",
  "aiph",
] as const;

export function resolveWorld3CompareMetric(
  key: keyof World3SimulationBuffers,
  definitions: ReadonlyMap<keyof World3SimulationBuffers, World3SeriesDefinition> = SERIES_BY_KEY,
): { label: string; variable: keyof World3SimulationBuffers } {
  const definition = definitions.get(key);
  if (!definition?.compareMetricLabel) {
    throw new Error(`Missing compare metric label for ${key}`);
  }
  return {
    label: definition.compareMetricLabel,
    variable: definition.key,
  };
}

export const WORLD3_COMPARE_METRICS = ([
  "pop",
  "iopc",
  "fpc",
  "ppolx",
  "nrfr",
  "le",
] as const).map((key) => resolveWorld3CompareMetric(key));

export function resolveWorld3SimulationPlotVariable(
  key: keyof World3SimulationBuffers,
  definitions: ReadonlyMap<keyof World3SimulationBuffers, World3SeriesDefinition> = SERIES_BY_KEY,
): { label: string; variable: keyof World3SimulationBuffers } {
  const definition = definitions.get(key);
  if (!definition?.simulationPlotLabel) {
    throw new Error(`Missing simulation plot label for ${key}`);
  }
  return {
    label: definition.simulationPlotLabel,
    variable: definition.key,
  };
}

export const WORLD3_SIMULATION_PLOT_VARIABLES = ([
  "pop",
  "nrfr",
  "iopc",
  "fpc",
  "ppolx",
] as const).map((key) => resolveWorld3SimulationPlotVariable(key));

export function buildWorld3VariableMeta(): Record<
  string,
  { full_name: string; sector: string; unit: string }
> {
  return Object.fromEntries(
    WORLD3_SERIES_REGISTRY.map((definition) => [
      definition.key,
      {
        full_name: definition.fullName,
        sector: definition.sector,
        unit: definition.unit,
      },
    ]),
  );
}

export function buildWorld3ConstantMeta(): Record<
  string,
  { full_name: string; sector: string; unit: string }
> {
  return Object.fromEntries(
    WORLD3_CONSTANT_REGISTRY.map((definition) => [
      definition.key,
      {
        full_name: definition.fullName,
        sector: definition.sector,
        unit: definition.unit,
      },
    ]),
  );
}

export function buildWorld3SeriesResult(
  buffers: World3SimulationBuffers,
): Record<string, TimeSeriesResult> {
  const series: Record<string, TimeSeriesResult> = {};
  for (const definition of WORLD3_SERIES_REGISTRY) {
    series[definition.key] = {
      name: definition.key,
      values: Array.from(buffers[definition.key]),
    };
  }
  return series;
}
