/**
 * Compare view — side-by-side scenario comparison with metrics and overlay charts.
 */

const CompareView = (() => {
  const SHARED_SCENARIO_VALUE = "__shared__";
  const CHART_GROUPS = [
    { id: "cmp-chart-pop", titleKey: "explore.chart.population_life", vars: ["pop", "le"] },
    { id: "cmp-chart-econ", titleKey: "explore.chart.economy_food", vars: ["iopc", "fpc"] },
    { id: "cmp-chart-poll", titleKey: "explore.chart.pollution", vars: ["ppolx"] },
    { id: "cmp-chart-res", titleKey: "explore.chart.resources", vars: ["nrfr"] },
  ];

  function populateSelects(selectA, selectB, presetA, presetB, sharedScenario) {
    [selectA, selectB].forEach((sel) => {
      sel.innerHTML = "";
      State.presets.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.name;
        opt.textContent = `${UI.labelPreset(p)} — ${UI.describePreset(p).slice(0, 50)}`;
        sel.appendChild(opt);
      });
    });
    if (sharedScenario) {
      const opt = document.createElement("option");
      opt.value = SHARED_SCENARIO_VALUE;
      opt.textContent = I18n.t("compare.shared_scenario", undefined, "Shared custom scenario");
      selectB.appendChild(opt);
    }
    selectA.value = presetA;
    selectB.value = sharedScenario ? SHARED_SCENARIO_VALUE : presetB;
  }

  function renderMetrics(container, metrics, labelA, labelB) {
    let html = `<table class="metrics-table">
      <thead><tr>
        <th>${UI.escapeHtml(I18n.t("compare.metric"))}</th>
        <th>${UI.escapeHtml(labelA)}</th>
        <th>${UI.escapeHtml(labelB)}</th>
        <th>${UI.escapeHtml(I18n.t("compare.delta"))}</th>
      </tr></thead><tbody>`;
    metrics.forEach((m) => {
      const delta = m.delta_pct !== null && m.delta_pct !== undefined
        ? UI.formatPercent(m.delta_pct, { mode: "percent", maximumFractionDigits: 1 })
        : "—";
      let cls = "delta-neutral";
      if (m.delta_pct > 0) cls = "delta-positive";
      if (m.delta_pct < 0) cls = "delta-negative";
      const metricLabel = UI.labelVariable(m.variable, m.label);
      html += `<tr>
        <td>${UI.escapeHtml(metricLabel)}</td>
        <td>${UI.formatNumber(m.value_a)}</td>
        <td>${UI.formatNumber(m.value_b)}</td>
        <td class="${cls}">${delta}</td>
      </tr>`;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
  }

  function renderChartGrid(container) {
    container.innerHTML = "";
    CHART_GROUPS.forEach((group) => {
      const panel = UI.el("div", "chart-panel");
      const header = UI.el("div", "chart-panel__header");
      header.appendChild(UI.el("span", "chart-panel__title", I18n.t(group.titleKey)));
      const wrap = UI.el("div", "chart-container");
      const canvas = document.createElement("canvas");
      canvas.id = group.id;
      wrap.appendChild(canvas);
      panel.appendChild(header);
      panel.appendChild(wrap);
      Charts.renderExplainer(panel, group.id);
      container.appendChild(panel);
    });
  }

  async function runComparison(presetA, presetB, sharedScenario) {
    const metricsEl = document.getElementById("compare-metrics");
    const chartsEl = document.getElementById("compare-charts");
    const statusEl = document.getElementById("compare-status");
    if (!metricsEl || !chartsEl) return;

    if (statusEl) statusEl.innerHTML = `<div class="spinner">${I18n.t("common.loading_compare")}</div>`;
    renderChartGrid(chartsEl);

    try {
      const scenarioA = { preset: presetA };
      const scenarioB = sharedScenario
        ? {
            preset: sharedScenario.preset || presetB,
            request: ScenarioState.savedScenarioStateToRequest(sharedScenario),
          }
        : { preset: presetB };
      const data = await SimulationProvider.compare(
        scenarioA,
        scenarioB
      );
      const labelA = I18n.labelForPreset(presetA, data.scenario_a);
      const labelB = sharedScenario
        ? I18n.t("compare.shared_scenario", undefined, "Shared custom scenario")
        : I18n.labelForPreset(presetB, data.scenario_b);

      if (statusEl) statusEl.innerHTML = "";
      renderMetrics(metricsEl, data.metrics, labelA, labelB);

      CHART_GROUPS.forEach((group) => {
        const canvas = document.getElementById(group.id);
        if (canvas) {
          Charts.renderCompare(
            canvas, data.results_a, data.results_b,
            group.vars, labelA, labelB
          );
        }
      });
    } catch (err) {
      if (statusEl) UI.showError(statusEl, err.message);
    }
  }

  function render(params) {
    const presetA = params.a || "doubled-resources";
    const presetB = params.bpreset || params.b || "standard-run";
    const sharedScenario =
      typeof ScenarioState !== "undefined" && params.bscenario
        ? ScenarioState.decodeSavedScenarioState(params.bscenario)
        : null;

    const selectA = document.getElementById("compare-select-a");
    const selectB = document.getElementById("compare-select-b");
    if (!selectA || !selectB) return;

    populateSelects(selectA, selectB, presetA, presetB, sharedScenario);

    // Wire up change handlers
    const onChange = () => {
      if (selectB.value === SHARED_SCENARIO_VALUE && sharedScenario) {
        Router.go(
          ScenarioState.buildCompareScenarioHash({
            leftPreset: selectA.value,
            rightPreset: presetB,
            rightState: sharedScenario,
          }),
        );
        return;
      }
      Router.go(`/compare?a=${encodeURIComponent(selectA.value)}&b=${encodeURIComponent(selectB.value)}`);
    };
    selectA.onchange = onChange;
    selectB.onchange = onChange;

    runComparison(
      presetA,
      presetB,
      sharedScenario,
    );
  }

  return { render };
})();
