/**
 * Advanced view — constant editor with accordion sections + auto-simulation.
 *
 * Moving any slider (or changing a number input) automatically triggers a
 * debounced simulation (400 ms).
 */

const AdvancedView = (() => {
  const VIEW_MODES = {
    split: "split",
    combined: "combined",
  };
  const CHART_GROUPS = [
    { id: "adv-chart-pop", titleKey: "explore.chart.population_life", vars: ["pop", "le"] },
    { id: "adv-chart-econ", titleKey: "explore.chart.economy_food", vars: ["iopc", "fpc"] },
    { id: "adv-chart-poll", titleKey: "explore.chart.pollution", vars: ["ppolx"] },
    { id: "adv-chart-res", titleKey: "explore.chart.resources", vars: ["nrfr"] },
  ];
  const COMBINED_GROUP = {
    id: "adv-chart-classic",
    titleKey: "explore.chart.classic",
    vars: ["pop", "nrfr", "iopc", "fpc", "ppolx"],
  };

  const DEBOUNCE_MS = 400;

  let editedConstants = {};
  let debounceTimer = null;
  let abortController = null;
  let baselineResultPromise = null;
  let latestResult = null;
  let currentViewMode = VIEW_MODES.combined;
  let runSequence = 0;
  let isChartsLoading = false;

  /** Compute a sensible slider range from a default value. */
  function sliderRange(defaultVal) {
    if (defaultVal === 0) return { min: 0, max: 1, step: 0.01 };
    const abs = Math.abs(defaultVal);
    // Fractions (0–1): allow 0 to 2
    if (abs <= 1) return { min: 0, max: Math.max(2, defaultVal * 5), step: 0.01 };
    // Small values (1–100): 0 to 5×
    if (abs <= 100) return { min: 0, max: defaultVal * 5, step: 0.1 };
    // Large values: 0 to 5× with magnitude-appropriate step
    const magnitude = Math.pow(10, Math.floor(Math.log10(abs)) - 1);
    return { min: 0, max: defaultVal * 5, step: magnitude };
  }

  // ---------------------------------------------------------------------------
  // Loading overlay
  // ---------------------------------------------------------------------------

  function setChartsLoading(loading) {
    isChartsLoading = loading;
    document.querySelectorAll("#advanced-charts .chart-loading-overlay")
      .forEach((el) => el.classList.toggle("active", loading));
  }

  function activeChartGroups() {
    return currentViewMode === VIEW_MODES.combined ? [COMBINED_GROUP] : CHART_GROUPS;
  }

  function ensureBaselineResult() {
    if (!baselineResultPromise) {
      baselineResultPromise = SimulationProvider.simulatePreset("standard-run").catch((err) => {
        baselineResultPromise = null;
        throw err;
      });
    }
    return baselineResultPromise;
  }

  // ---------------------------------------------------------------------------
  // Debounced simulation trigger
  // ---------------------------------------------------------------------------

  function triggerSimulation() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSimulation, DEBOUNCE_MS);
  }

  // ---------------------------------------------------------------------------
  // Accordion builder
  // ---------------------------------------------------------------------------

  function buildAccordions(container) {
    container.innerHTML = "";
    editedConstants = {};

    // Group constants by sector
    const sectors = {};
    for (const [name, meta] of Object.entries(State.constantMeta)) {
      if (!sectors[meta.sector]) sectors[meta.sector] = [];
      sectors[meta.sector].push(name);
    }

    for (const [sector, names] of Object.entries(sectors)) {
      const details = document.createElement("details");
      details.className = "accordion";

      const summary = document.createElement("summary");
      summary.textContent = UI.labelSector(sector, sector);
      details.appendChild(summary);

      const body = UI.el("div", "accordion__body");

      names.forEach((name) => {
        const meta = State.constantMeta[name];
        const defaultVal = State.constantDefaults[name];
        const range = sliderRange(defaultVal);

        const group = UI.el("div", "input-group");

        const label = document.createElement("label");
        label.textContent = UI.labelConstant(name, meta.full_name);
        label.setAttribute("for", `const-${name}`);
        group.appendChild(label);

        const desc = UI.el("div", "input-desc", `${name} — default: ${defaultVal}`);
        group.appendChild(desc);

        // Number input row
        const row = UI.el("div", "input-row");
        const input = document.createElement("input");
        input.type = "number";
        input.id = `const-${name}`;
        input.value = defaultVal;
        input.step = "any";
        row.appendChild(input);

        const unit = UI.el("span", "unit", meta.unit);
        row.appendChild(unit);

        const resetBtn = document.createElement("button");
        resetBtn.className = "btn-reset";
        resetBtn.textContent = I18n.t("advanced.reset");
        row.appendChild(resetBtn);

        group.appendChild(row);

        // Slider row
        const sliderRow = UI.el("div", "slider-row");
        const minLabel = UI.el("span", "slider-bounds slider-bounds--min", UI.formatNumber(range.min));
        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = range.min;
        slider.max = range.max;
        slider.step = range.step;
        slider.value = defaultVal;
        slider.setAttribute(
          "aria-label",
          I18n.t("advanced.slider_aria", { name: UI.labelConstant(name, meta.full_name) })
        );
        const maxLabel = UI.el("span", "slider-bounds slider-bounds--max", UI.formatNumber(range.max));
        sliderRow.appendChild(minLabel);
        sliderRow.appendChild(slider);
        sliderRow.appendChild(maxLabel);
        group.appendChild(sliderRow);

        // Sync slider → number input
        function onValueChange(val) {
          if (!isNaN(val) && val !== defaultVal) {
            editedConstants[name] = val;
          } else {
            delete editedConstants[name];
          }
          triggerSimulation();
        }

        slider.addEventListener("input", () => {
          const val = parseFloat(slider.value);
          input.value = val;
          onValueChange(val);
        });

        input.addEventListener("change", () => {
          const val = parseFloat(input.value);
          if (!isNaN(val)) {
            // Clamp slider to range but allow number input to exceed
            slider.value = Math.min(Math.max(val, range.min), range.max);
            onValueChange(val);
          }
        });

        resetBtn.addEventListener("click", () => {
          input.value = defaultVal;
          slider.value = defaultVal;
          delete editedConstants[name];
          triggerSimulation();
        });

        body.appendChild(group);
      });

      details.appendChild(body);
      if (sector === "population") details.open = true;
      container.appendChild(details);
    }
  }

  // ---------------------------------------------------------------------------
  // Chart grid (rendered once per view init, not per simulation)
  // ---------------------------------------------------------------------------

  function renderChartGrid(container) {
    container.querySelectorAll("canvas").forEach((canvas) => Charts.destroy(canvas));
    container.innerHTML = "";
    activeChartGroups().forEach((group) => {
      const panel = UI.el(
        "div",
        currentViewMode === VIEW_MODES.combined
          ? "chart-panel chart-panel--combined"
          : "chart-panel"
      );
      const header = UI.el("div", "chart-panel__header");
      header.appendChild(UI.el("span", "chart-panel__title", I18n.t(group.titleKey)));
      const wrap = UI.el(
        "div",
        currentViewMode === VIEW_MODES.combined
          ? "chart-container chart-container--combined"
          : "chart-container"
      );
      const canvas = document.createElement("canvas");
      canvas.id = group.id;
      wrap.appendChild(canvas);

      // Loading overlay (sits on top of canvas inside chart-container)
      const overlay = UI.el("div", "chart-loading-overlay");
      wrap.appendChild(overlay);

      panel.appendChild(header);
      panel.appendChild(wrap);
      if (currentViewMode !== VIEW_MODES.combined) {
        Charts.renderExplainer(panel, group.id);
      }
      container.appendChild(panel);
    });
  }

  function renderViewToggle(container) {
    if (!container) return;
    container.innerHTML = "";

    const toggle = UI.el("div", "chart-view-toggle");
    toggle.appendChild(UI.el("span", "chart-view-toggle__label", I18n.t("explore.view_label")));

    [
      [VIEW_MODES.split, I18n.t("explore.view_split")],
      [VIEW_MODES.combined, I18n.t("explore.view_combined")],
    ].forEach(([mode, text]) => {
      const button = UI.el("button", "chart-view-toggle__button", text);
      if (mode === currentViewMode) button.classList.add("active");
      button.addEventListener("click", async () => {
        if (mode === currentViewMode) return;
        currentViewMode = mode;
        const chartsEl = document.getElementById("advanced-charts");
        const statusEl = document.getElementById("advanced-status");
        renderViewToggle(container);
        if (chartsEl) {
          renderChartGrid(chartsEl);
          setChartsLoading(isChartsLoading);
          if (latestResult) {
            try {
              await renderChartResults(latestResult);
            } catch (err) {
              if (statusEl) UI.showError(statusEl, err.message);
            }
          }
        }
      });
      toggle.appendChild(button);
    });

    container.appendChild(toggle);
  }

  async function renderChartResults(result) {
    let baseline = null;
    try {
      baseline = await ensureBaselineResult();
    } catch (_err) {
      baseline = null;
    }

    const editedLabel = I18n.t("nav.advanced");

    activeChartGroups().forEach((group) => {
      const canvas = document.getElementById(group.id);
      if (!canvas) return;
      if (baseline) {
        const baselineLabel = I18n.labelForPreset("standard-run", "Standard run");
        Charts.renderCompare(
          canvas,
          baseline,
          result,
          group.vars,
          baselineLabel,
          editedLabel
        );
        return;
      }
      Charts.renderSingle(canvas, result.time, result.series, group.vars);
    });
  }

  // ---------------------------------------------------------------------------
  // Simulation runner (cancels any in-flight request)
  // ---------------------------------------------------------------------------

  async function runSimulation() {
    const chartsEl = document.getElementById("advanced-charts");
    const statusEl = document.getElementById("advanced-status");
    if (!chartsEl) return;
    const runId = ++runSequence;

    // Abort any in-flight request
    if (abortController) abortController.abort();
    abortController = new AbortController();
    const { signal } = abortController;

    setChartsLoading(true);
    if (statusEl) statusEl.innerHTML = "";

    try {
      const request = {};
      if (Object.keys(editedConstants).length > 0) {
        request.constants = { ...editedConstants };
      }
      const result = await SimulationProvider.simulate(request, { signal });
      if (runId !== runSequence) return;

      latestResult = result;
      await renderChartResults(result);
      if (runId !== runSequence) return;
      setChartsLoading(false);
    } catch (err) {
      if (err.name === "AbortError") return; // superseded by newer request
      setChartsLoading(false);
      if (statusEl) UI.showError(statusEl, err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  function compareWithStandard() {
    Router.go("#compare?a=standard-run&b=standard-run");
  }

  // ---------------------------------------------------------------------------
  // View entry point
  // ---------------------------------------------------------------------------

  function render() {
    const accordionEl = document.getElementById("advanced-accordions");
    if (accordionEl) buildAccordions(accordionEl);

    // Apply calibrated constants if coming from the Calibrate view
    if (State.calibratedConstants) {
      for (const [name, value] of Object.entries(State.calibratedConstants)) {
        const input = document.getElementById(`const-${name}`);
        if (input) {
          input.value = value;
          // Also update the slider if within range
          const slider = input.closest(".input-group")?.querySelector('input[type="range"]');
          if (slider) {
            slider.value = Math.min(Math.max(value, parseFloat(slider.min)), parseFloat(slider.max));
          }
          editedConstants[name] = value;
        }
      }
      State.calibratedConstants = null;
    }

    // Render chart grid once (charts update in-place on each simulation)
    const chartsEl = document.getElementById("advanced-charts");
    if (chartsEl) renderChartGrid(chartsEl);
    renderViewToggle(document.getElementById("advanced-view-controls"));

    const compareBtn = document.getElementById("advanced-compare");
    if (compareBtn) {
      compareBtn.onclick = compareWithStandard;
    }

    // Auto-run with defaults on view init
    triggerSimulation();
  }

  return { render };
})();
