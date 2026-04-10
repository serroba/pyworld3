/**
 * Chart.js configuration factory and render helpers.
 *
 * Provides typed wrappers around Chart.js for simulation data rendering,
 * including synchronized crosshairs, annotation lines, dual y-axes,
 * normalized charts, and math explainers.
 */

import type { SimulationResult } from "./simulation-contracts.js";
import type { World3VariableKey } from "./core/world3-keys.js";

// ── External globals (loaded via <script> tags before this module) ──

declare const Chart: any;
declare const I18n: {
  t(key: string, params?: unknown, fallback?: string): string;
  formatNumber(value: number, opts?: Record<string, unknown>): string;
  getDirection(): string;
};
declare const State: {
  variableMeta: Record<string, { full_name?: string; unit?: string }>;
};
declare const UI: {
  formatNumber(value: number): string;
  labelVariable(key: string, fallback: string): string;
};
declare const MATH_EXPLAINERS: Record<string, unknown> | undefined;
declare const ModelDomain:
  | {
      hydrateExplainer(raw: unknown): {
        plain: string;
        equations?: { label: string; html: string }[];
        variables?: { key: string; meta: { full_name: string } }[];
      } | null;
    }
  | undefined;

// ── Types ───────────────────────────────────────────────────────────

export type AnnotationLine = {
  year: number;
  label?: string;
  color?: string;
  dash?: number[];
};

export type AnnotationConfig = {
  lines: AnnotationLine[];
};

export type AnnotationOptions = {
  policyYear?: number;
  divergeYear?: number;
  /** Override for testing — defaults to new Date().getFullYear(). */
  currentYear?: number;
};

type SeriesMap = SimulationResult["series"];
type AxisMap = Record<string, "y" | "y1">;

// ── Constants ───────────────────────────────────────────────────────

const SERIES_COLORS: Record<string, string> = {
  nrfr: "#1f77b4",
  nr: "#1f77b4",
  iopc: "#ff7f0e",
  io: "#ff7f0e",
  fpc: "#2ca02c",
  f: "#2ca02c",
  pop: "#d62728",
  le: "#0a7b83",
  ppolx: "#9467bd",
  ppol: "#9467bd",
};

const FALLBACK_COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#0a7b83",
];

const CROSSHAIR_YEAR_STEP = 0.5;

const UNIT_I18N: Record<string, string> = {
  "people": "unit.people",
  "years": "unit.years",
  "resource units": "unit.resource_units",
  "pollution units": "unit.pollution_units",
  "births/1000/yr": "unit.births_per_1000_yr",
  "deaths/1000/yr": "unit.deaths_per_1000_yr",
  "$/person/yr": "unit.dollar_per_person_yr",
  "kg/person/yr": "unit.kg_per_person_yr",
  "$/yr": "unit.dollar_per_yr",
  "$/ha/yr": "unit.dollar_per_ha_yr",
  "kg/yr": "unit.kg_per_yr",
  "kg/ha/yr": "unit.kg_per_ha_yr",
  "ha": "unit.ha",
};

// ── Module state ────────────────────────────────────────────────────

let syncedYear: number | null = null;
let syncInProgress = false;

// ── Utility functions ───────────────────────────────────────────────

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function colorForVar(varKey: string, colorIndex: number): string {
  return SERIES_COLORS[varKey] ?? FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length]!;
}

function normalizeYear(year: number): number {
  return Math.round(year / CROSSHAIR_YEAR_STEP) * CROSSHAIR_YEAR_STEP;
}

/** Translate a raw unit string via i18n, falling back to the raw value. */
export function translateUnit(raw: string): string {
  if (!raw || raw === "-") return "";
  const key = UNIT_I18N[raw];
  return key ? I18n.t(key, {}, raw) : raw;
}

function unitLabel(varKeys: string[]): string {
  const units = [...new Set(varKeys.map((k) => {
    const m = State.variableMeta[k];
    return m ? translateUnit(m.unit ?? "") : "";
  }).filter(Boolean))];
  return units.join(", ");
}

// ── Annotation builder ──────────────────────────────────────────────

export function buildAnnotations(opts?: AnnotationOptions): AnnotationConfig {
  const lines: AnnotationLine[] = [];
  const currentYear = opts?.currentYear ?? new Date().getFullYear();
  const textMuted = cssVar("--color-text-muted") || "#6b7b8d";
  const accent = cssVar("--color-primary") || "#0a7b83";

  lines.push({
    year: currentYear,
    label: I18n.t("chart.annotation.now", undefined, "Now"),
    color: textMuted,
    dash: [3, 3],
  });

  const policyYear = opts?.divergeYear ?? opts?.policyYear;
  if (policyYear && policyYear !== currentYear) {
    lines.push({
      year: policyYear,
      label: I18n.t("chart.annotation.policy", undefined, "Policy"),
      color: accent,
      dash: [6, 3],
    });
  }

  return { lines };
}

// ── Chart.js plugins ────────────────────────────────────────────────

function nearestPointIndex(dataset: any, year: number): number {
  if (!dataset?.data?.length) return -1;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  dataset.data.forEach((point: any, index: number) => {
    if (point == null || typeof point.x !== "number" || point.y == null) return;
    const distance = Math.abs(point.x - year);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestDistance === Number.POSITIVE_INFINITY ? -1 : bestIndex;
}

function connectedCharts(): any[] {
  return Object.values(Chart.instances || {}).filter((chart: any) => {
    if (!chart?.canvas?.isConnected) return false;
    const viewEl = chart.canvas.closest(".view");
    if (!viewEl) return true;
    return viewEl.classList.contains("active");
  });
}

function activeElementsForYear(chart: any, year: number): Array<{ datasetIndex: number; index: number }> {
  const firstDataset = chart.data?.datasets?.find(
    (ds: any) => Array.isArray(ds.data) && ds.data.length,
  );
  if (!firstDataset) return [];
  const index = nearestPointIndex(firstDataset, year);
  if (index < 0) return [];
  return chart.data.datasets
    .map((ds: any, datasetIndex: number) => {
      const point = ds.data?.[index];
      if (!point || point.y == null) return null;
      return { datasetIndex, index };
    })
    .filter(Boolean);
}

function syncChartsToYear(year: number): void {
  if (syncInProgress) return;
  const normalizedYear = normalizeYear(year);
  if (syncedYear !== null && normalizedYear === syncedYear) return;
  syncInProgress = true;
  syncedYear = normalizedYear;
  connectedCharts().forEach((chart) => {
    const elements = activeElementsForYear(chart, normalizedYear);
    if (!elements.length) {
      chart.setActiveElements([]);
      chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
      chart.draw();
      return;
    }
    const x = chart.scales.x.getPixelForValue(normalizedYear);
    const y = chart.chartArea.top + 12;
    chart.setActiveElements(elements);
    chart.tooltip?.setActiveElements(elements, { x, y });
    chart.draw();
  });
  syncInProgress = false;
}

function clearSyncedCrosshair(): void {
  if (syncInProgress) return;
  if (syncedYear === null) return;
  syncInProgress = true;
  syncedYear = null;
  connectedCharts().forEach((chart) => {
    chart.setActiveElements([]);
    chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
    chart.draw();
  });
  syncInProgress = false;
}

const SyncCrosshairPlugin = {
  id: "syncCrosshair",
  afterEvent(chart: any, args: any) {
    const event = args?.event;
    if (!event) return;
    if (event.type === "mouseout") { clearSyncedCrosshair(); return; }
    if (event.type !== "mousemove") return;
    const xScale = chart.scales.x;
    if (!xScale) return;
    const { left, right, top, bottom } = chart.chartArea || {};
    if (
      typeof left !== "number" ||
      event.x < left || event.x > right ||
      event.y < top || event.y > bottom
    ) {
      clearSyncedCrosshair();
      return;
    }
    const year = xScale.getValueForPixel(event.x);
    if (!Number.isFinite(year)) return;
    syncChartsToYear(year);
  },
  afterDatasetsDraw(chart: any) {
    const tooltip = chart.tooltip;
    if (!tooltip?.getActiveElements().length) return;
    const x = tooltip.getActiveElements()[0]?.element?.x;
    if (typeof x !== "number") return;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx as CanvasRenderingContext2D;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = (cssVar("--color-text") || "#17324d") + "55";
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  },
};

const AnnotationLinesPlugin = {
  id: "annotationLines",
  afterDatasetsDraw(chart: any) {
    const annotations: AnnotationLine[] | undefined =
      chart.options?.plugins?.annotationLines?.lines;
    if (!annotations?.length) return;
    const xScale = chart.scales.x;
    if (!xScale) return;
    const { top, bottom, left, right } = chart.chartArea;
    const ctx = chart.ctx as CanvasRenderingContext2D;

    for (const ann of annotations) {
      const x = xScale.getPixelForValue(ann.year);
      if (x < left || x > right) continue;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = ann.color ?? "#888888";
      ctx.setLineDash(ann.dash ?? [4, 4]);
      ctx.stroke();

      if (ann.label) {
        ctx.font = "10px sans-serif";
        ctx.fillStyle = ann.color ?? "#888888";
        ctx.textAlign = "center";
        ctx.fillText(ann.label, x, top - 4);
      }

      ctx.restore();
    }
  },
};

// ── Theme ───────────────────────────────────────────────────────────

function applyChartTheme(): void {
  const textColor = cssVar("--color-text-muted") || "#4f5e6e";
  const borderColor = cssVar("--color-border") || "#dfe6e2";
  Chart.defaults.color = textColor;
  Chart.defaults.borderColor = borderColor;
  Chart.defaults.plugins.legend.labels.color = textColor;
}

// ── Scale & dataset builders ────────────────────────────────────────

function yearTicks(): Record<string, unknown> {
  return {
    autoSkip: true,
    maxTicksLimit: 9,
    callback(value: number) {
      const year = Math.round(value);
      return year % 25 === 0
        ? I18n.formatNumber(year, { maximumFractionDigits: 0 })
        : "";
    },
  };
}

function assignAxes(varKeys: string[]): AxisMap {
  const axes: AxisMap = {};
  let firstUnit: string | null = null;
  for (const key of varKeys) {
    const meta = State.variableMeta[key];
    const unit = meta?.unit ?? "";
    if (firstUnit === null) {
      firstUnit = unit;
      axes[key] = "y";
    } else if (unit === firstUnit) {
      axes[key] = "y";
    } else {
      axes[key] = "y1";
    }
  }
  return axes;
}

function buildScales(varKeys: string[]): { scales: Record<string, unknown>; axisMap: AxisMap } {
  const axisMap = assignAxes(varKeys);
  const needsY1 = Object.values(axisMap).includes("y1");

  const scales: Record<string, unknown> = {
    x: {
      type: "linear",
      ticks: yearTicks(),
      title: { display: true, text: I18n.t("chart.axis.year") },
    },
    y: {
      position: "left",
      title: { display: true, text: unitLabel(varKeys.filter((k) => axisMap[k] === "y")) },
      ticks: { callback: (v: number) => UI.formatNumber(Number(v)) },
    },
  };

  if (needsY1) {
    scales.y1 = {
      position: "right",
      grid: { drawOnChartArea: false },
      title: { display: true, text: unitLabel(varKeys.filter((k) => axisMap[k] === "y1")) },
      ticks: { callback: (v: number) => UI.formatNumber(Number(v)) },
    };
  }

  return { scales, axisMap };
}

function onHover(_event: unknown, activeElements: any[], chart: any): void {
  if (!activeElements?.length && syncedYear !== null) {
    clearSyncedCrosshair();
    return;
  }
  if (!activeElements?.length) return;
  const point = chart.data.datasets?.[activeElements[0].datasetIndex]?.data?.[activeElements[0].index];
  if (point && typeof point.x === "number") syncChartsToYear(point.x);
}

function baseOptions(varKeys: string[], annotations?: AnnotationConfig): Record<string, unknown> & { _axisMap: AxisMap } {
  const { scales, axisMap } = buildScales(varKeys);
  const isRtl = I18n.getDirection() === "rtl";
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        rtl: isRtl,
        textDirection: isRtl ? "rtl" : "ltr",
        labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
      },
      tooltip: {
        rtl: isRtl,
        textDirection: isRtl ? "rtl" : "ltr",
        callbacks: {
                    label(ctx: any) {
            const meta = State.variableMeta[ctx.dataset.varKey];
            const translated = meta ? translateUnit(meta.unit ?? "") : "";
            const unit = translated ? ` ${translated}` : "";
            return `${ctx.dataset.label}: ${UI.formatNumber(ctx.parsed.y)}${unit}`;
          },
                  },
      },
      annotationLines: annotations ?? buildAnnotations(),
    },
    onHover,
    scales,
    _axisMap: axisMap,
  };
}

function makeDataset(
  time: number[],
  series: SeriesMap,
  varKey: string,
  colorIndex: number,
  dashed: boolean,
  yAxisID: string,
): Record<string, unknown> {
  const meta = State.variableMeta[varKey] ?? {};
  const color = colorForVar(varKey, colorIndex);
  return {
    label: UI.labelVariable(varKey, meta.full_name ?? varKey),
    varKey,
    yAxisID: yAxisID || "y",
    data: time.map((t, i) => ({ x: t, y: series[varKey as World3VariableKey]?.values[i] ?? null })),
    borderColor: color,
    backgroundColor: color + "22",
    borderWidth: 2,
    borderDash: dashed ? [6, 3] : [],
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.1,
  };
}

function destroyIfExists(canvas: HTMLCanvasElement): void {
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();
  canvas.setAttribute("role", "img");
  if (!canvas.getAttribute("aria-label")) {
    const panel = canvas.closest(".chart-panel");
    const title = panel?.querySelector(".chart-panel__title");
    canvas.setAttribute("aria-label", title?.textContent?.trim() || "Simulation chart");
  }
}

function normalizedOpts(isRtl: boolean, annotations: AnnotationConfig): Record<string, unknown> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        rtl: isRtl,
        textDirection: isRtl ? "rtl" : "ltr",
        labels: { boxWidth: 12, padding: 8, font: { size: 11 } },
      },
      tooltip: {
        rtl: isRtl,
        textDirection: isRtl ? "rtl" : "ltr",
        callbacks: {
                    label(ctx: any) {
            const ds = ctx.dataset;
            const rawVal = ds._rawData?.[ctx.dataIndex];
            const meta = State.variableMeta[ds.varKey];
            const translated = meta ? translateUnit(meta.unit ?? "") : "";
            const unit = translated ? ` ${translated}` : "";
            return `${ds.label}: ${UI.formatNumber(rawVal ?? 0)}${unit}`;
          },
                  },
      },
      syncCrosshair: true,
      annotationLines: annotations,
    },
    onHover,
    scales: {
      x: {
        type: "linear",
        ticks: yearTicks(),
        title: { display: true, text: I18n.t("chart.axis.year") },
      },
      y: { display: false, min: 0, max: 1 },
    },
  };
}

// ── Public API ──────────────────────────────────────────────────────

export function renderSingle(
  canvas: HTMLCanvasElement,
  time: number[],
  series: SeriesMap,
  varKeys: string[],
  annotationOpts?: AnnotationOptions,
): void {
  destroyIfExists(canvas);
  const annotations = buildAnnotations(annotationOpts);
  const opts = baseOptions(varKeys, annotations);
  const axisMap = opts._axisMap;
  delete (opts as Record<string, unknown>)._axisMap;
  const datasets = varKeys.map((key, i) =>
    makeDataset(time, series, key, i, false, axisMap[key]!),
  );
  new Chart(canvas, { type: "line", data: { datasets }, options: opts });
}

export function renderCompare(
  canvas: HTMLCanvasElement,
  resultA: SimulationResult,
  resultB: SimulationResult,
  varKeys: string[],
  labelA: string,
  labelB: string,
  annotationOpts?: AnnotationOptions,
): void {
  destroyIfExists(canvas);
  const annotations = buildAnnotations(annotationOpts);
  const opts = baseOptions(varKeys, annotations);
  const axisMap = opts._axisMap;
  delete (opts as Record<string, unknown>)._axisMap;
  const datasets: Record<string, unknown>[] = [];
  varKeys.forEach((key, i) => {
    const metaName = UI.labelVariable(key, (State.variableMeta[key] ?? {}).full_name ?? key);
    const dsA = makeDataset(resultA.time, resultA.series, key, i, false, axisMap[key]!);
    dsA.label = `${metaName} (${labelA})`;
    datasets.push(dsA);
    const dsB = makeDataset(resultB.time, resultB.series, key, i, true, axisMap[key]!);
    dsB.label = `${metaName} (${labelB})`;
    datasets.push(dsB);
  });
  new Chart(canvas, { type: "line", data: { datasets }, options: opts });
}

export function renderNormalized(
  canvas: HTMLCanvasElement,
  time: number[],
  series: SeriesMap,
  varKeys: string[],
  annotationOpts?: AnnotationOptions,
): void {
  destroyIfExists(canvas);
  const isRtl = I18n.getDirection() === "rtl";
  const annotations = buildAnnotations(annotationOpts);
  const datasets = varKeys.map((key, i) => {
    const meta = State.variableMeta[key] ?? {};
    const raw = series[key as World3VariableKey]?.values ?? [];
    const max = raw.reduce((a, b) => Math.max(a, b), 0) || 1;
    const color = colorForVar(key, i);
    return {
      label: UI.labelVariable(key, meta.full_name ?? key),
      varKey: key,
      yAxisID: "y",
      data: time.map((t, j) => ({ x: t, y: raw[j] != null ? raw[j] / max : null })),
      _rawData: raw,
      _max: max,
      borderColor: color,
      backgroundColor: color + "22",
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.1,
    };
  });
  new Chart(canvas, { type: "line", data: { datasets }, options: normalizedOpts(isRtl, annotations) });
}

export function renderNormalizedCompare(
  canvas: HTMLCanvasElement,
  resultA: SimulationResult,
  resultB: SimulationResult,
  varKeys: string[],
  labelA: string,
  labelB: string,
  annotationOpts?: AnnotationOptions,
): void {
  destroyIfExists(canvas);
  const isRtl = I18n.getDirection() === "rtl";
  const annotations = buildAnnotations(annotationOpts);
  const datasets: Record<string, unknown>[] = [];
  varKeys.forEach((key, i) => {
    const meta = State.variableMeta[key] ?? {};
    const metaName = UI.labelVariable(key, meta.full_name ?? key);
    const rawA = resultA.series[key as World3VariableKey]?.values ?? [];
    const rawB = resultB.series[key as World3VariableKey]?.values ?? [];
    const max = Math.max(
      rawA.reduce((a, b) => Math.max(a, b), 0),
      rawB.reduce((a, b) => Math.max(a, b), 0),
    ) || 1;
    const color = colorForVar(key, i);
    datasets.push({
      label: `${metaName} (${labelA})`,
      varKey: key, yAxisID: "y",
      data: resultA.time.map((t, j) => ({ x: t, y: rawA[j] != null ? rawA[j] / max : null })),
      _rawData: rawA, _max: max,
      borderColor: color, backgroundColor: color + "22",
      borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.1,
    });
    datasets.push({
      label: `${metaName} (${labelB})`,
      varKey: key, yAxisID: "y",
      data: resultB.time.map((t, j) => ({ x: t, y: rawB[j] != null ? rawB[j] / max : null })),
      _rawData: rawB, _max: max,
      borderColor: color, backgroundColor: color + "22",
      borderWidth: 2, borderDash: [6, 3],
      pointRadius: 0, pointHoverRadius: 4, tension: 0.1,
    });
  });
  new Chart(canvas, { type: "line", data: { datasets }, options: normalizedOpts(isRtl, annotations) });
}

export function destroy(canvas: HTMLCanvasElement): void {
  destroyIfExists(canvas);
}

export function renderExplainer(panel: HTMLElement, groupId: string): void {
  const baseId = groupId.replace(/^(?:cmp-|adv-)/, "");
  const rawData = typeof MATH_EXPLAINERS !== "undefined" ? MATH_EXPLAINERS[baseId] : null;
  const data =
    rawData && typeof ModelDomain !== "undefined"
      ? ModelDomain.hydrateExplainer(rawData)
      : null;
  if (!data) return;

  const wrapper = document.createElement("div");
  wrapper.className = "math-explainer";

  const outer = document.createElement("details");
  const outerSummary = document.createElement("summary");
  outerSummary.textContent = I18n.t("chart.explainer.how");
  outer.appendChild(outerSummary);

  const text = document.createElement("p");
  text.className = "explainer-text";
  text.textContent = data.plain;
  outer.appendChild(text);

  if (data.equations?.length) {
    const inner = document.createElement("details");
    const innerSummary = document.createElement("summary");
    innerSummary.textContent = I18n.t("chart.explainer.equations");
    inner.appendChild(innerSummary);

    data.equations.forEach((eq) => {
      const block = document.createElement("div");
      block.className = "eq-block";
      const label = document.createElement("span");
      label.className = "eq-label";
      label.textContent = eq.label + ": ";
      block.appendChild(label);
      const eqSpan = document.createElement("span");
      eqSpan.className = "eq";
      eqSpan.innerHTML = eq.html;
      block.appendChild(eqSpan);
      inner.appendChild(block);
    });

    outer.appendChild(inner);
  }

  if (data.variables?.length) {
    const tags = document.createElement("div");
    tags.className = "explainer-vars";
    data.variables.forEach((variableRef) => {
      const tag = document.createElement("span");
      tag.className = "var-tag";
      tag.textContent = `${variableRef.key}: ${UI.labelVariable(variableRef.key, variableRef.meta.full_name)}`;
      tags.appendChild(tag);
    });
    outer.appendChild(tags);
  }

  wrapper.appendChild(outer);
  panel.appendChild(wrapper);
}

// ── Register plugins and theme ──────────────────────────────────────

if (typeof Chart !== "undefined") {
  Chart.register(SyncCrosshairPlugin);
  Chart.register(AnnotationLinesPlugin);
  applyChartTheme();

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      applyChartTheme();
      Object.values(Chart.instances).forEach((c: unknown) => (c as { update(): void }).update());
    });
  }
}

// ── Global binding (consumed by hand-written view JS files) ─────────

declare global {
  interface Window {
    Charts: typeof chartsApi;
  }
}

const chartsApi = {
  translateUnit,
  buildAnnotations,
  renderSingle,
  renderCompare,
  renderNormalized,
  renderNormalizedCompare,
  destroy,
  renderExplainer,
};

window.Charts = chartsApi;
