/**
 * Chart.js configuration factory and render helpers.
 */

const Charts = (() => {
  const COLORS = [
    "#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2",
  ];

  /** Destroy any existing chart on a canvas. */
  function destroyIfExists(canvas) {
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
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

  /** Base chart options. */
  function baseOptions(unitLabel) {
    return {
      responsive: true,
      maintainAspectRatio: false,
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
      scales: {
        x: { type: "linear", ticks: yearTicks(), title: { display: true, text: "Year" } },
        y: { title: { display: !!unitLabel, text: unitLabel || "" } },
      },
    };
  }

  /** Build a dataset from simulation series. */
  function makeDataset(time, series, varKey, colorIndex, dashed) {
    const meta = State.variableMeta[varKey] || {};
    return {
      label: meta.full_name || varKey,
      varKey,
      data: time.map((t, i) => ({ x: t, y: series[varKey]?.values[i] ?? null })),
      borderColor: COLORS[colorIndex % COLORS.length],
      backgroundColor: COLORS[colorIndex % COLORS.length] + "22",
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
     * @param {HTMLCanvasElement} canvas
     * @param {number[]} time
     * @param {Object} series - { varKey: { values: [] } }
     * @param {string[]} varKeys - variables to plot
     */
    renderSingle(canvas, time, series, varKeys) {
      destroyIfExists(canvas);
      const datasets = varKeys.map((key, i) => makeDataset(time, series, key, i, false));
      new Chart(canvas, {
        type: "line",
        data: { datasets },
        options: baseOptions(),
      });
    },

    /**
     * Render a comparison chart with two scenarios overlaid.
     * @param {HTMLCanvasElement} canvas
     * @param {Object} resultA - { time, series }
     * @param {Object} resultB - { time, series }
     * @param {string[]} varKeys
     * @param {string} labelA
     * @param {string} labelB
     */
    renderCompare(canvas, resultA, resultB, varKeys, labelA, labelB) {
      destroyIfExists(canvas);
      const datasets = [];
      varKeys.forEach((key, i) => {
        const metaName = (State.variableMeta[key] || {}).full_name || key;
        const dsA = makeDataset(resultA.time, resultA.series, key, i, false);
        dsA.label = `${metaName} (${labelA})`;
        datasets.push(dsA);
        const dsB = makeDataset(resultB.time, resultB.series, key, i, true);
        dsB.label = `${metaName} (${labelB})`;
        datasets.push(dsB);
      });
      new Chart(canvas, {
        type: "line",
        data: { datasets },
        options: baseOptions(),
      });
    },

    /** Destroy chart on a canvas. */
    destroy(canvas) {
      destroyIfExists(canvas);
    },
  };
})();
