/**
 * Advanced view — constant editor with accordion sections + auto-simulation.
 *
 * Moving any slider (or changing a number input) automatically triggers a
 * debounced simulation.  The "Run simulation" button bypasses the debounce
 * for an immediate run.
 */

const AdvancedView = (() => {
  const CHART_GROUPS = [
    { id: "adv-chart-pop", title: "Population & Life Expectancy", vars: ["pop", "le"] },
    { id: "adv-chart-econ", title: "Economy & Food", vars: ["iopc", "fpc"] },
    { id: "adv-chart-poll", title: "Pollution", vars: ["ppolx"] },
    { id: "adv-chart-res", title: "Resources", vars: ["nrfr"] },
  ];

  const DEBOUNCE_MS = 400;

  let editedConstants = {};
  let debounceTimer = null;
  let abortController = null;

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
    document.querySelectorAll("#advanced-charts .chart-loading-overlay")
      .forEach((el) => el.classList.toggle("active", loading));
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
      summary.textContent = sector;
      details.appendChild(summary);

      const body = UI.el("div", "accordion__body");

      names.forEach((name) => {
        const meta = State.constantMeta[name];
        const defaultVal = State.constantDefaults[name];
        const range = sliderRange(defaultVal);

        const group = UI.el("div", "input-group");

        const label = document.createElement("label");
        label.textContent = meta.full_name;
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
        resetBtn.textContent = "Reset";
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
        slider.setAttribute("aria-label", `${meta.full_name} slider`);
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
      container.appendChild(details);
    }
  }

  // ---------------------------------------------------------------------------
  // Chart grid (rendered once per view init, not per simulation)
  // ---------------------------------------------------------------------------

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

      // Loading overlay (sits on top of canvas inside chart-container)
      const overlay = UI.el("div", "chart-loading-overlay");
      wrap.appendChild(overlay);

      panel.appendChild(header);
      panel.appendChild(wrap);
      Charts.renderExplainer(panel, group.id);
      container.appendChild(panel);
    });
  }

  // ---------------------------------------------------------------------------
  // Simulation runner (cancels any in-flight request)
  // ---------------------------------------------------------------------------

  async function runSimulation() {
    const chartsEl = document.getElementById("advanced-charts");
    const statusEl = document.getElementById("advanced-status");
    if (!chartsEl) return;

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
      const result = await API.simulate(request, { signal });

      setChartsLoading(false);

      CHART_GROUPS.forEach((group) => {
        const canvas = document.getElementById(group.id);
        if (canvas) Charts.renderSingle(canvas, result.time, result.series, group.vars);
      });
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

    const runBtn = document.getElementById("advanced-run");
    if (runBtn) {
      runBtn.onclick = () => {
        clearTimeout(debounceTimer);
        runSimulation();
      };
    }

    const compareBtn = document.getElementById("advanced-compare");
    if (compareBtn) {
      compareBtn.onclick = compareWithStandard;
    }

    // Auto-run with defaults on view init
    triggerSimulation();
  }

  return { render };
})();
