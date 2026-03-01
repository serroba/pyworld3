/**
 * Compare view — side-by-side scenario comparison with metrics and overlay charts.
 */

const CompareView = (() => {
  const CHART_GROUPS = [
    { id: "cmp-chart-pop", title: "Population & Life Expectancy", vars: ["pop", "le"] },
    { id: "cmp-chart-econ", title: "Economy & Food", vars: ["iopc", "fpc"] },
    { id: "cmp-chart-poll", title: "Pollution", vars: ["ppolx"] },
    { id: "cmp-chart-res", title: "Resources", vars: ["nrfr"] },
  ];

  function populateSelects(selectA, selectB, presetA, presetB) {
    [selectA, selectB].forEach((sel) => {
      sel.innerHTML = "";
      State.presets.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.name;
        opt.textContent = `${p.name} — ${p.description.slice(0, 50)}`;
        sel.appendChild(opt);
      });
    });
    selectA.value = presetA;
    selectB.value = presetB;
  }

  function renderMetrics(container, metrics, labelA, labelB) {
    let html = `<table class="metrics-table">
      <thead><tr>
        <th>Metric</th>
        <th>${UI.escapeHtml(labelA)}</th>
        <th>${UI.escapeHtml(labelB)}</th>
        <th>Delta</th>
      </tr></thead><tbody>`;
    metrics.forEach((m) => {
      const delta = m.delta_pct != null ? m.delta_pct.toFixed(1) + "%" : "—";
      let cls = "delta-neutral";
      if (m.delta_pct > 0) cls = "delta-positive";
      if (m.delta_pct < 0) cls = "delta-negative";
      html += `<tr>
        <td>${UI.escapeHtml(m.label)}</td>
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
      header.appendChild(UI.el("span", "chart-panel__title", group.title));
      const wrap = UI.el("div", "chart-container");
      const canvas = document.createElement("canvas");
      canvas.id = group.id;
      wrap.appendChild(canvas);
      panel.appendChild(header);
      panel.appendChild(wrap);
      container.appendChild(panel);
    });
  }

  async function runComparison(presetA, presetB) {
    const metricsEl = document.getElementById("compare-metrics");
    const chartsEl = document.getElementById("compare-charts");
    const statusEl = document.getElementById("compare-status");
    if (!metricsEl || !chartsEl) return;

    if (statusEl) statusEl.innerHTML = '<div class="spinner">Comparing scenarios\u2026</div>';
    renderChartGrid(chartsEl);

    try {
      const data = await API.compare(
        { preset: presetA },
        { preset: presetB }
      );

      if (statusEl) statusEl.innerHTML = "";
      renderMetrics(metricsEl, data.metrics, data.scenario_a, data.scenario_b);

      CHART_GROUPS.forEach((group) => {
        const canvas = document.getElementById(group.id);
        if (canvas) {
          Charts.renderCompare(
            canvas, data.results_a, data.results_b,
            group.vars, data.scenario_a, data.scenario_b
          );
        }
      });
    } catch (err) {
      if (statusEl) UI.showError(statusEl, err.message);
    }
  }

  function render(params) {
    const presetA = params.a || "doubled-resources";
    const presetB = params.b || "standard-run";

    const selectA = document.getElementById("compare-select-a");
    const selectB = document.getElementById("compare-select-b");
    if (!selectA || !selectB) return;

    populateSelects(selectA, selectB, presetA, presetB);

    // Wire up change handlers
    const onChange = () => {
      Router.go(`#compare?a=${encodeURIComponent(selectA.value)}&b=${encodeURIComponent(selectB.value)}`);
    };
    selectA.onchange = onChange;
    selectB.onchange = onChange;

    runComparison(presetA, presetB);
  }

  return { render };
})();
