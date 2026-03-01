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
      scales,
      _axisMap: axisMap, // stash for dataset assignment
    };
  }

  /** Build a dataset from simulation series. */
  function makeDataset(time, series, varKey, colorIndex, dashed, yAxisID) {
    const meta = State.variableMeta[varKey] || {};
    return {
      label: meta.full_name || varKey,
      varKey,
      yAxisID: yAxisID || "y",
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
