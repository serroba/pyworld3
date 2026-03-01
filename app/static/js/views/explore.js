/**
 * Explore view — preset picker + 4 chart panels.
 */

const ExploreView = (() => {
  const CHART_GROUPS = [
    { id: "chart-pop", title: "Population & Life Expectancy", vars: ["pop", "le"] },
    { id: "chart-econ", title: "Economy & Food", vars: ["iopc", "fpc"] },
    { id: "chart-poll", title: "Pollution", vars: ["ppolx"] },
    { id: "chart-res", title: "Resources", vars: ["nrfr"] },
  ];

  let currentPreset = null;

  function renderPills(container, activePreset) {
    container.innerHTML = "";
    State.presets.forEach((preset) => {
      const pill = UI.el("button", "pill", preset.name);
      if (preset.name === activePreset) pill.classList.add("active");
      pill.addEventListener("click", () => {
        Router.go(`#explore?preset=${encodeURIComponent(preset.name)}`);
      });
      container.appendChild(pill);
    });
  }

  function renderChartGrid(container) {
    container.innerHTML = "";
    CHART_GROUPS.forEach((group) => {
      const panel = UI.el("div", "chart-panel");
      const header = UI.el("div", "chart-panel__header");
      header.appendChild(UI.el("span", "chart-panel__title", group.title));

      // Tooltip with variable descriptions
      const desc = group.vars
        .map((v) => {
          const m = State.variableMeta[v];
          return m ? `${m.full_name} (${v})` : v;
        })
        .join(", ");
      header.appendChild(UI.helpIcon(desc));

      const wrap = UI.el("div", "chart-container");
      const canvas = document.createElement("canvas");
      canvas.id = group.id;
      wrap.appendChild(canvas);
      panel.appendChild(header);
      panel.appendChild(wrap);
      container.appendChild(panel);
    });
  }

  async function loadAndRender(presetName) {
    const chartsEl = document.getElementById("explore-charts");
    const pillsEl = document.getElementById("explore-pills");
    if (!chartsEl || !pillsEl) return;

    renderPills(pillsEl, presetName);

    // Only rebuild chart grid if needed
    if (currentPreset === null) {
      renderChartGrid(chartsEl);
    }

    // Show spinner in each chart
    CHART_GROUPS.forEach((g) => {
      const canvas = document.getElementById(g.id);
      if (canvas) Charts.destroy(canvas);
    });

    const statusEl = document.getElementById("explore-status");
    if (statusEl) statusEl.innerHTML = '<div class="spinner">Running simulation\u2026</div>';

    try {
      const result = await API.simulatePreset(presetName);
      currentPreset = presetName;
      if (statusEl) statusEl.innerHTML = "";

      CHART_GROUPS.forEach((group) => {
        const canvas = document.getElementById(group.id);
        if (canvas) Charts.renderSingle(canvas, result.time, result.series, group.vars);
      });
    } catch (err) {
      if (statusEl) UI.showError(statusEl, err.message);
    }
  }

  function render(params) {
    const presetName = params.preset || "standard-run";
    // Rebuild chart grid each time view renders
    currentPreset = null;
    const chartsEl = document.getElementById("explore-charts");
    if (chartsEl) renderChartGrid(chartsEl);
    loadAndRender(presetName);
  }

  return { render };
})();
