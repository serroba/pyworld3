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
};

export const WORLD3_SERIES_REGISTRY = [
  { key: "pop", fullName: "Total population", sector: "Population", unit: "people", kind: "stock" },
  { key: "le", fullName: "Life expectancy", sector: "Population", unit: "years", kind: "auxiliary" },
  { key: "iopc", fullName: "Industrial output per capita", sector: "Capital", unit: "$/person/yr", kind: "auxiliary" },
  { key: "fpc", fullName: "Food per capita", sector: "Agriculture", unit: "kg/person/yr", kind: "auxiliary" },
  { key: "ppolx", fullName: "Pollution index", sector: "Pollution", unit: "-", kind: "auxiliary" },
  { key: "nrfr", fullName: "Nonrenewable resource fraction remaining", sector: "Resources", unit: "-", kind: "auxiliary" },
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
  { key: "al", fullName: "Arable land", sector: "Agriculture", unit: "ha", kind: "stock" },
  { key: "pal", fullName: "Potentially arable land", sector: "Agriculture", unit: "ha", kind: "stock" },
  { key: "uil", fullName: "Urban-industrial land", sector: "Agriculture", unit: "ha", kind: "stock" },
  { key: "lfert", fullName: "Land fertility", sector: "Agriculture", unit: "kg/ha/yr", kind: "stock" },
  { key: "ly", fullName: "Land yield", sector: "Agriculture", unit: "kg/ha/yr", kind: "auxiliary" },
  { key: "f", fullName: "Total food production", sector: "Agriculture", unit: "kg/yr", kind: "flow" },
  { key: "ai", fullName: "Agricultural inputs", sector: "Agriculture", unit: "$/yr", kind: "flow" },
  { key: "pfr", fullName: "Perceived food ratio", sector: "Agriculture", unit: "-", kind: "auxiliary" },
  { key: "ppol", fullName: "Persistent pollution", sector: "Pollution", unit: "pollution units", kind: "stock" },
  { key: "nr", fullName: "Nonrenewable resources remaining", sector: "Resources", unit: "resource units", kind: "stock" },
  { key: "nrur", fullName: "Nonrenewable resource usage rate", sector: "Resources", unit: "resource units/yr", kind: "flow" },
  { key: "fioai", fullName: "Fraction industrial output for industry", sector: "Capital", unit: "-", kind: "auxiliary" },
  { key: "fioaa", fullName: "Fraction industrial output for agriculture", sector: "Capital", unit: "-", kind: "auxiliary" },
  { key: "tai", fullName: "Total agricultural investment", sector: "Agriculture", unit: "$/yr", kind: "flow" },
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
  { key: "aiph", fullName: "Agricultural inputs per hectare", sector: "Agriculture", unit: "$/ha/yr", kind: "auxiliary" },
  { key: "ler", fullName: "Land erosion rate", sector: "Agriculture", unit: "ha/yr", kind: "flow" },
  { key: "ldr", fullName: "Land development rate", sector: "Agriculture", unit: "ha/yr", kind: "flow" },
  { key: "lrui", fullName: "Land removal for urban-industrial use", sector: "Agriculture", unit: "ha/yr", kind: "flow" },
  { key: "ppapr", fullName: "Persistent pollution appearance rate", sector: "Pollution", unit: "pollution units/yr", kind: "flow" },
  { key: "ppasr", fullName: "Persistent pollution assimilation rate", sector: "Pollution", unit: "pollution units/yr", kind: "flow" },
] as const satisfies readonly World3SeriesDefinition[];

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
