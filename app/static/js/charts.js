/**
 * Chart.js configuration factory and render helpers.
 */

const Charts = (() => {
  const SERIES_COLORS = {
    pop: "#2b7fff",
    le: "#0a7b83",
    iopc: "#e63946",
    io: "#e63946",
    fpc: "#fb8500",
    f: "#fb8500",
    nrfr: "#51b86b",
    nr: "#51b86b",
    ppolx: "#9b3ecb",
    ppol: "#9b3ecb",
  };
  const FALLBACK_COLORS = [
    "#2b7fff", "#51b86b", "#fb8500", "#e63946", "#9b3ecb", "#0a7b83",
  ];
  const CROSSHAIR_COLOR = "#17324d55";
  const CROSSHAIR_YEAR_STEP = 0.5;
  let syncedYear = null;
  let syncInProgress = false;

  const SyncCrosshairPlugin = {
    id: "syncCrosshair",
    afterEvent(chart, args) {
      const { event } = args;
      if (!event) return;
      if (event.type === "mouseout") {
        clearSyncedCrosshair();
        return;
      }
      if (event.type !== "mousemove") return;
      const xScale = chart.scales.x;
      if (!xScale) return;
      const { left, right, top, bottom } = chart.chartArea || {};
      if (
        typeof left !== "number" ||
        event.x < left ||
        event.x > right ||
        event.y < top ||
        event.y > bottom
      ) {
        clearSyncedCrosshair();
        return;
      }
      const year = xScale.getValueForPixel(event.x);
      if (!Number.isFinite(year)) return;
      syncChartsToYear(year);
    },
    afterDatasetsDraw(chart) {
      const tooltip = chart.tooltip;
      if (!tooltip || !tooltip.getActiveElements().length) return;
      const x = tooltip.getActiveElements()[0]?.element?.x;
      if (typeof x !== "number") return;
      const { top, bottom } = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = CROSSHAIR_COLOR;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.restore();
    },
  };

  if (typeof Chart !== "undefined") {
    Chart.register(SyncCrosshairPlugin);
  }

  /** Destroy any existing chart on a canvas. */
  function destroyIfExists(canvas) {
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
  }

  function connectedCharts() {
    return Object.values(Chart.instances || {}).filter((chart) => {
      if (!chart || !chart.canvas || !chart.canvas.isConnected) return false;
      const viewEl = chart.canvas.closest(".view");
      if (!viewEl) return true;
      return viewEl.classList.contains("active");
    });
  }

  function normalizeYear(year) {
    return Math.round(year / CROSSHAIR_YEAR_STEP) * CROSSHAIR_YEAR_STEP;
  }

  function nearestPointIndex(dataset, year) {
    if (!dataset || !Array.isArray(dataset.data) || !dataset.data.length) return -1;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    dataset.data.forEach((point, index) => {
      if (point == null || typeof point.x !== "number" || point.y == null) return;
      const distance = Math.abs(point.x - year);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestDistance === Number.POSITIVE_INFINITY ? -1 : bestIndex;
  }

  function activeElementsForYear(chart, year) {
    const firstDataset = chart.data?.datasets?.find((dataset) =>
      Array.isArray(dataset.data) && dataset.data.length
    );
    if (!firstDataset) return [];
    const index = nearestPointIndex(firstDataset, year);
    if (index < 0) return [];
    return chart.data.datasets
      .map((dataset, datasetIndex) => {
        const point = dataset.data?.[index];
        if (!point || point.y == null) return null;
        return { datasetIndex, index };
      })
      .filter(Boolean);
  }

  function syncChartsToYear(year) {
    if (syncInProgress) return;
    const normalizedYear = normalizeYear(year);
    if (syncedYear !== null && normalizedYear === syncedYear) return;
    syncInProgress = true;
    syncedYear = normalizedYear;
    connectedCharts().forEach((chart) => {
      const activeElements = activeElementsForYear(chart, normalizedYear);
      if (!activeElements.length) {
        chart.setActiveElements([]);
        chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
        chart.draw();
        return;
      }
      const x = chart.scales.x.getPixelForValue(normalizedYear);
      const y = chart.chartArea.top + 12;
      chart.setActiveElements(activeElements);
      chart.tooltip?.setActiveElements(activeElements, { x, y });
      chart.draw();
    });
    syncInProgress = false;
  }

  function clearSyncedCrosshair() {
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

  function colorForVar(varKey, colorIndex) {
    return SERIES_COLORS[varKey] || FALLBACK_COLORS[colorIndex % FALLBACK_COLORS.length];
  }

  /** Build x-axis ticks for year range. */
  function yearTicks() {
    return {
      autoSkip: true,
      maxTicksLimit: 9,
      callback(value) {
        const year = Math.round(value);
        return year % 25 === 0 ? year : "";
      },
    };
  }

  /**
   * Determine which y-axis each variable should use.
   * If variables have different units, the second distinct unit gets axis "y1".
   * Returns a map of varKey → axisId ("y" or "y1").
   */
  function assignAxes(varKeys) {
    const axes = {};
    let firstUnit = null;
    for (const key of varKeys) {
      const meta = State.variableMeta[key];
      const unit = meta ? meta.unit : "";
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

  /** Build scale config, adding a right-hand y1 axis when needed. */
  function buildScales(varKeys) {
    const axisMap = assignAxes(varKeys);
    const needsY1 = Object.values(axisMap).includes("y1");

    const scales = {
      x: { type: "linear", ticks: yearTicks(), title: { display: true, text: "Year" } },
      y: {
        position: "left",
        title: { display: true, text: unitLabel(varKeys.filter((k) => axisMap[k] === "y")) },
        ticks: { callback: (v) => UI.formatNumber(v) },
      },
    };

    if (needsY1) {
      scales.y1 = {
        position: "right",
        grid: { drawOnChartArea: false },
        title: { display: true, text: unitLabel(varKeys.filter((k) => axisMap[k] === "y1")) },
        ticks: { callback: (v) => UI.formatNumber(v) },
      };
    }

    return { scales, axisMap };
  }

  /** Derive a y-axis label from a set of variable keys. */
  function unitLabel(varKeys) {
    const units = [...new Set(varKeys.map((k) => {
      const m = State.variableMeta[k];
      return m ? m.unit : "";
    }).filter(Boolean))];
    return units.join(", ");
  }

  /** Base chart options. */
  function baseOptions(varKeys) {
    const { scales, axisMap } = buildScales(varKeys);
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, padding: 8, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label(ctx) {
              const meta = State.variableMeta[ctx.dataset.varKey];
              const unit = meta ? ` ${meta.unit}` : "";
              return `${ctx.dataset.label}: ${UI.formatNumber(ctx.parsed.y)}${unit}`;
            },
          },
        },
      },
      onHover(_event, activeElements, chart) {
        if (!activeElements?.length && syncedYear !== null) {
          clearSyncedCrosshair();
          return;
        }
        if (!activeElements?.length) return;
        const point = chart.data.datasets?.[activeElements[0].datasetIndex]?.data?.[activeElements[0].index];
        if (point && typeof point.x === "number") syncChartsToYear(point.x);
      },
      scales,
      _axisMap: axisMap, // stash for dataset assignment
    };
  }

  /** Build a dataset from simulation series. */
  function makeDataset(time, series, varKey, colorIndex, dashed, yAxisID) {
    const meta = State.variableMeta[varKey] || {};
    const color = colorForVar(varKey, colorIndex);
    return {
      label: meta.full_name || varKey,
      varKey,
      yAxisID: yAxisID || "y",
      data: time.map((t, i) => ({ x: t, y: series[varKey]?.values[i] ?? null })),
      borderColor: color,
      backgroundColor: color + "22",
      borderWidth: 2,
      borderDash: dashed ? [6, 3] : [],
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.1,
    };
  }

  return {
    /**
     * Render a chart panel with one or more variables from a single simulation.
     * Uses dual y-axes when variables have different units.
     */
    renderSingle(canvas, time, series, varKeys) {
      destroyIfExists(canvas);
      const opts = baseOptions(varKeys);
      const axisMap = opts._axisMap;
      delete opts._axisMap;
      const datasets = varKeys.map((key, i) =>
        makeDataset(time, series, key, i, false, axisMap[key])
      );
      new Chart(canvas, { type: "line", data: { datasets }, options: opts });
    },

    /**
     * Render a comparison chart with two scenarios overlaid.
     * Uses dual y-axes when variables have different units.
     */
    renderCompare(canvas, resultA, resultB, varKeys, labelA, labelB) {
      destroyIfExists(canvas);
      const opts = baseOptions(varKeys);
      const axisMap = opts._axisMap;
      delete opts._axisMap;
      const datasets = [];
      varKeys.forEach((key, i) => {
        const metaName = (State.variableMeta[key] || {}).full_name || key;
        const dsA = makeDataset(resultA.time, resultA.series, key, i, false, axisMap[key]);
        dsA.label = `${metaName} (${labelA})`;
        datasets.push(dsA);
        const dsB = makeDataset(resultB.time, resultB.series, key, i, true, axisMap[key]);
        dsB.label = `${metaName} (${labelB})`;
        datasets.push(dsB);
      });
      new Chart(canvas, { type: "line", data: { datasets }, options: opts });
    },

    /** Destroy chart on a canvas. */
    destroy(canvas) {
      destroyIfExists(canvas);
    },

    /**
     * Append a math-explainer section to a chart panel.
     * @param {HTMLElement} panel - The .chart-panel element.
     * @param {string} groupId - Chart group ID (may include cmp-/adv- prefix).
     */
    renderExplainer(panel, groupId) {
      // Normalize prefixed IDs to base key
      const baseId = groupId.replace(/^(?:cmp-|adv-)/, "");
      const data = typeof MATH_EXPLAINERS !== "undefined" && MATH_EXPLAINERS[baseId];
      if (!data) return;

      const wrapper = document.createElement("div");
      wrapper.className = "math-explainer";

      // Outer details: "How does this work?"
      const outer = document.createElement("details");
      const outerSummary = document.createElement("summary");
      outerSummary.textContent = "How does this work?";
      outer.appendChild(outerSummary);

      const text = document.createElement("p");
      text.className = "explainer-text";
      text.textContent = data.plain;
      outer.appendChild(text);

      // Inner details: "See the equations"
      if (data.equations && data.equations.length) {
        const inner = document.createElement("details");
        const innerSummary = document.createElement("summary");
        innerSummary.textContent = "See the equations";
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

      // Variable tags
      if (data.variables && data.variables.length) {
        const tags = document.createElement("div");
        tags.className = "explainer-vars";
        data.variables.forEach((v) => {
          const tag = document.createElement("span");
          tag.className = "var-tag";
          const meta = State.variableMeta[v];
          tag.textContent = meta ? `${v}: ${meta.full_name}` : v;
          tags.appendChild(tag);
        });
        outer.appendChild(tags);
      }

      wrapper.appendChild(outer);
      panel.appendChild(wrapper);
    },
  };
})();
