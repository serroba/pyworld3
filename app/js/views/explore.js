/**
 * Explore view — preset picker + 4 chart panels.
 */

const ExploreView = (() => {
  const VIEW_MODES = {
    split: "split",
    combined: "combined",
  };
  const CHART_GROUPS = [
    { id: "chart-pop", titleKey: "explore.chart.population_life", vars: ["pop", "le"] },
    { id: "chart-econ", titleKey: "explore.chart.economy_food", vars: ["iopc", "fpc"] },
    { id: "chart-poll", titleKey: "explore.chart.pollution", vars: ["ppolx"] },
    { id: "chart-res", titleKey: "explore.chart.resources", vars: ["nrfr"] },
  ];
  const COMBINED_GROUP = {
    id: "chart-classic",
    titleKey: "explore.chart.classic",
    vars: ["pop", "nrfr", "iopc", "fpc", "ppolx"],
  };

  let currentPreset = null;
  let currentViewMode = VIEW_MODES.split;

  /** Known constant keys that switch at pyear via clip(). */
  const POLICY_SWITCH_KEYS = new Set([
    "icor2", "nruf2", "lyf2", "ppgf2", "alai2", "pptd2",
    "alic2", "alsc2", "scor2", "fioac2",
    "dcfsn", "pet", "zpgt",
  ]);

  function annotationOptsForPreset(presetName) {
    const preset = State.presets.find((p) => p.name === presetName);
    if (!preset) return {};
    const keys = Object.keys(preset.constants || {});
    if (keys.some((k) => POLICY_SWITCH_KEYS.has(k))) {
      return { policyYear: 1975 };
    }
    return {};
  }

  function renderPills(container, activePreset) {
    container.innerHTML = "";
    State.presets.forEach((preset) => {
      const pill = UI.el("button", "pill", UI.labelPreset(preset));
      if (preset.name === activePreset) pill.classList.add("active");
      pill.addEventListener("click", () => {
        Router.go(
          `/explore?preset=${encodeURIComponent(preset.name)}&view=${encodeURIComponent(currentViewMode)}`
        );
      });
      container.appendChild(pill);
    });
  }

  function renderChartGrid(container) {
    container.innerHTML = "";
    CHART_GROUPS.forEach((group) => {
      const panel = UI.el("div", "chart-panel");
      const header = UI.el("div", "chart-panel__header");
      header.appendChild(UI.el("span", "chart-panel__title", I18n.t(group.titleKey)));

      // Tooltip with variable descriptions
      const desc = group.vars
        .map((v) => {
          const m = State.variableMeta[v];
          return m ? `${UI.labelVariable(v, m.full_name)} (${v})` : v;
        })
        .join(", ");
      header.appendChild(UI.helpIcon(desc));

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

  function renderCombinedChart(container) {
    container.innerHTML = "";
    const panel = UI.el("div", "chart-panel chart-panel--combined");
    const header = UI.el("div", "chart-panel__header");
    header.appendChild(UI.el("span", "chart-panel__title", I18n.t(COMBINED_GROUP.titleKey)));
    header.appendChild(UI.helpIcon(
      I18n.t("explore.classic_help")
    ));

    const wrap = UI.el("div", "chart-container chart-container--combined");
    const canvas = document.createElement("canvas");
    canvas.id = COMBINED_GROUP.id;
    wrap.appendChild(canvas);
    panel.appendChild(header);
    panel.appendChild(wrap);
    container.appendChild(panel);
  }

  function renderViewToggle(container, activeMode, presetName) {
    container.innerHTML = "";
    const toggle = UI.el("div", "chart-view-toggle");
    const label = UI.el("span", "chart-view-toggle__label", I18n.t("explore.view_label"));
    toggle.appendChild(label);

    [
      [VIEW_MODES.split, I18n.t("explore.view_split")],
      [VIEW_MODES.combined, I18n.t("explore.view_combined")],
    ].forEach(([mode, text]) => {
      const button = UI.el("button", "chart-view-toggle__button", text);
      if (mode === activeMode) button.classList.add("active");
      button.addEventListener("click", () => {
        Router.go(
          `/explore?preset=${encodeURIComponent(presetName)}&view=${encodeURIComponent(mode)}`
        );
      });
      toggle.appendChild(button);
    });

    container.appendChild(toggle);
  }

  async function loadAndRender(presetName, viewMode) {
    const chartsEl = document.getElementById("explore-charts");
    const pillsEl = document.getElementById("explore-pills");
    const controlsEl = document.getElementById("explore-view-controls");
    if (!chartsEl || !pillsEl || !controlsEl) return;

    renderPills(pillsEl, presetName);
    renderViewToggle(controlsEl, viewMode, presetName);

    // Only rebuild chart grid if needed
    if (currentPreset === null || currentViewMode !== viewMode) {
      if (viewMode === VIEW_MODES.combined) {
        renderCombinedChart(chartsEl);
      } else {
        renderChartGrid(chartsEl);
      }
    }

    // Show spinner in each chart
    const chartGroups = viewMode === VIEW_MODES.combined ? [COMBINED_GROUP] : CHART_GROUPS;
    chartGroups.forEach((g) => {
      const canvas = document.getElementById(g.id);
      if (canvas) Charts.destroy(canvas);
    });

    const statusEl = document.getElementById("explore-status");
    if (statusEl) statusEl.innerHTML = `<div class="spinner">${I18n.t("common.loading_simulation")}</div>`;

    try {
      const result = await SimulationProvider.simulatePreset(presetName);
      currentPreset = presetName;
      currentViewMode = viewMode;
      if (statusEl) statusEl.innerHTML = "";

      const annotationOpts = annotationOptsForPreset(presetName);
      chartGroups.forEach((group) => {
        const canvas = document.getElementById(group.id);
        if (!canvas) return;
        if (viewMode === VIEW_MODES.combined) {
          Charts.renderNormalized(canvas, result.time, result.series, group.vars, annotationOpts);
        } else {
          Charts.renderSingle(canvas, result.time, result.series, group.vars, annotationOpts);
        }
      });
    } catch (err) {
      if (statusEl) UI.showError(statusEl, err.message);
    }
  }

  function render(params) {
    const presetName = params.preset || "standard-run";
    const viewMode = params.view === VIEW_MODES.combined ? VIEW_MODES.combined : VIEW_MODES.split;
    // Rebuild chart grid each time view renders
    currentPreset = null;
    currentViewMode = viewMode;
    const chartsEl = document.getElementById("explore-charts");
    const controlsEl = document.getElementById("explore-view-controls");
    if (controlsEl) renderViewToggle(controlsEl, viewMode, presetName);
    if (chartsEl) {
      if (viewMode === VIEW_MODES.combined) renderCombinedChart(chartsEl);
      else renderChartGrid(chartsEl);
    }
    loadAndRender(presetName, viewMode);
  }

  return { render };
})();
