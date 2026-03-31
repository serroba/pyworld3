import { WORLD3_SIMULATION_PLOT_VARIABLES } from "./world3-registry.js";
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 600;
const LEGEND_WIDTH = 220;
const LEGEND_GAP = 20;
const PADDING = { top: 48, right: 40, bottom: 48, left: 72 };
const PLOT_VARIABLES = [
    { variables: ["pop"], label: WORLD3_SIMULATION_PLOT_VARIABLES.find((d) => d.variable === "pop")?.label ?? "Population", color: "#2196F3" },
    { variables: ["nr", "nrfr"], label: WORLD3_SIMULATION_PLOT_VARIABLES.find((d) => d.variable === "nrfr")?.label ?? "Resources", color: "#4CAF50" },
    { variables: ["iopc"], label: WORLD3_SIMULATION_PLOT_VARIABLES.find((d) => d.variable === "iopc")?.label ?? "Industrial output/cap", color: "#F44336" },
    { variables: ["fpc"], label: WORLD3_SIMULATION_PLOT_VARIABLES.find((d) => d.variable === "fpc")?.label ?? "Food/capita", color: "#FF9800" },
    { variables: ["ppolx"], label: WORLD3_SIMULATION_PLOT_VARIABLES.find((d) => d.variable === "ppolx")?.label ?? "Pollution index", color: "#9C27B0" },
];
function escapeXml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;");
}
function formatValue(value) {
    const absValue = Math.abs(value);
    if (absValue >= 1e12) {
        return `${(value / 1e12).toFixed(2)}T`;
    }
    if (absValue >= 1e9) {
        return `${(value / 1e9).toFixed(2)}B`;
    }
    if (absValue >= 1e6) {
        return `${(value / 1e6).toFixed(2)}M`;
    }
    if (absValue >= 1e3) {
        return `${(value / 1e3).toFixed(2)}K`;
    }
    return value.toFixed(2);
}
export function formatSimulationSummary(result, modelData) {
    const header = `World3 Simulation Summary (${result.year_min}-${result.year_max}, dt=${result.dt})`;
    const lines = [header, ""];
    const bySector = new Map();
    for (const [varName, series] of Object.entries(result.series)) {
        if (series.values.length === 0) {
            continue;
        }
        const meta = modelData.variableMeta[varName];
        const sector = meta?.sector ?? "Other";
        const fullName = meta?.full_name ?? varName;
        const first = series.values[0];
        const last = series.values[series.values.length - 1];
        if (first === undefined || last === undefined) {
            continue;
        }
        const min = Math.min(...series.values);
        const max = Math.max(...series.values);
        const midStart = Math.floor(series.values.length * 0.45);
        const midEnd = Math.floor(series.values.length * 0.55);
        const lateStart = Math.floor(series.values.length * 0.9);
        const middle = series.values.slice(midStart, Math.max(midStart + 1, midEnd));
        const late = series.values.slice(lateStart);
        const middleAverage = middle.reduce((sum, value) => sum + value, 0) / middle.length;
        const lateAverage = late.reduce((sum, value) => sum + value, 0) / late.length;
        const delta = middleAverage === 0 ? 0 : (lateAverage - middleAverage) / Math.abs(middleAverage);
        const trend = delta > 0.05 ? "rising" : delta < -0.05 ? "declining" : "stable";
        const line = `  ${varName.padEnd(10)} ${fullName.padEnd(45)} ` +
            `${first.toFixed(2).padStart(12)} -> ${last.toFixed(2).padStart(12)}  ` +
            `min=${min.toFixed(2).padEnd(12)}  max=${max.toFixed(2).padEnd(12)}  (${trend})`;
        const entries = bySector.get(sector) ?? [];
        entries.push(line);
        bySector.set(sector, entries);
    }
    for (const [sector, entries] of bySector.entries()) {
        lines.push(sector);
        lines.push("-".repeat(sector.length));
        lines.push(...entries);
        lines.push("");
    }
    return lines.join("\n").trimEnd();
}
export function renderSimulationSvg(result) {
    const plotWidth = SVG_WIDTH - PADDING.left - PADDING.right - LEGEND_WIDTH - LEGEND_GAP;
    const plotHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;
    const years = result.time;
    const minYear = years[0] ?? result.year_min;
    const maxYear = years[years.length - 1] ?? result.year_max;
    const xSpan = Math.max(1, maxYear - minYear);
    const legendItems = [];
    const paths = [];
    const legendLeft = PADDING.left + plotWidth + LEGEND_GAP;
    PLOT_VARIABLES.forEach(({ variables: varNames, label, color }, index) => {
        const series = varNames
            .map((varName) => result.series[varName])
            .find((candidate) => candidate?.values.length);
        const values = series?.values;
        if (!values || values.length === 0) {
            return;
        }
        const min = Math.min(...values);
        const max = Math.max(...values);
        const span = Math.max(1e-9, max - min);
        const points = values.map((value, pointIndex) => {
            const year = years[pointIndex] ?? minYear;
            const x = PADDING.left + ((year - minYear) / xSpan) * plotWidth;
            const normalized = (value - min) / span;
            const y = PADDING.top + (1 - normalized) * plotHeight;
            return `${pointIndex === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        });
        paths.push(`<path d="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />`);
        const legendY = PADDING.top + index * 24;
        legendItems.push(`<rect x="${legendLeft}" y="${legendY - 12}" width="14" height="14" fill="${color}" rx="3" />`, `<text x="${legendLeft + 22}" y="${legendY}" font-size="14" fill="#1f2937">${escapeXml(label)}</text>`);
    });
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const year = minYear + xSpan * ratio;
        const x = PADDING.left + plotWidth * ratio;
        return [
            `<line x1="${x}" y1="${PADDING.top}" x2="${x}" y2="${SVG_HEIGHT - PADDING.bottom}" stroke="#e5e7eb" stroke-width="1" />`,
            `<text x="${x}" y="${SVG_HEIGHT - 16}" text-anchor="middle" font-size="12" fill="#6b7280">${Math.round(year)}</text>`,
        ].join("");
    });
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = PADDING.top + plotHeight * ratio;
        const label = (1 - ratio).toFixed(2);
        return [
            `<line x1="${PADDING.left}" y1="${y}" x2="${PADDING.left + plotWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`,
            `<text x="18" y="${y + 4}" font-size="12" fill="#6b7280">${label}</text>`,
        ].join("");
    });
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-labelledby="title desc">
  <title id="title">World3 browser-native simulation plot</title>
  <desc id="desc">Normalized key simulation variables from ${minYear} to ${maxYear}.</desc>
  <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" fill="#ffffff" />
  <text x="${PADDING.left}" y="28" font-size="24" font-weight="700" fill="#111827">World3 Simulation — Key Variables</text>
  <text x="${PADDING.left}" y="48" font-size="14" fill="#4b5563">${result.year_min}-${result.year_max} • dt ${formatValue(result.dt)}</text>
  <rect x="${PADDING.left}" y="${PADDING.top}" width="${plotWidth}" height="${plotHeight}" fill="#f8fafc" stroke="#cbd5e1" />
  ${yTicks.join("")}
  ${xTicks.join("")}
  <line x1="${PADDING.left}" y1="${SVG_HEIGHT - PADDING.bottom}" x2="${SVG_WIDTH - PADDING.right}" y2="${SVG_HEIGHT - PADDING.bottom}" stroke="#64748b" stroke-width="1.5" />
  <line x1="${PADDING.left}" y1="${PADDING.top}" x2="${PADDING.left}" y2="${SVG_HEIGHT - PADDING.bottom}" stroke="#64748b" stroke-width="1.5" />
  ${paths.join("\n  ")}
  ${legendItems.join("\n  ")}
  <text x="${SVG_WIDTH / 2}" y="${SVG_HEIGHT - 4}" text-anchor="middle" font-size="13" fill="#6b7280">Year</text>
  <text x="20" y="${SVG_HEIGHT / 2}" text-anchor="middle" font-size="13" fill="#6b7280" transform="rotate(-90 20 ${SVG_HEIGHT / 2})">Normalized value</text>
</svg>`;
}
