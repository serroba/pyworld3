/**
 * Advanced view — constant editor with accordion sections + simulation runner.
 */

const AdvancedView = (() => {
  const CHART_GROUPS = [
    { id: "adv-chart-pop", title: "Population & Life Expectancy", vars: ["pop", "le"] },
    { id: "adv-chart-econ", title: "Economy & Food", vars: ["iopc", "fpc"] },
    { id: "adv-chart-poll", title: "Pollution", vars: ["ppolx"] },
    { id: "adv-chart-res", title: "Resources", vars: ["nrfr"] },
  ];

  let editedConstants = {};

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

        const group = UI.el("div", "input-group");

        const label = document.createElement("label");
        label.textContent = meta.full_name;
        label.setAttribute("for", `const-${name}`);
        group.appendChild(label);

        const desc = UI.el("div", "input-desc", `${name} — default: ${defaultVal}`);
        group.appendChild(desc);

        const row = UI.el("div", "input-row");
        const input = document.createElement("input");
        input.type = "number";
        input.id = `const-${name}`;
        input.value = defaultVal;
        input.step = "any";
        input.addEventListener("change", () => {
          const val = parseFloat(input.value);
          if (!isNaN(val) && val !== defaultVal) {
            editedConstants[name] = val;
          } else {
            delete editedConstants[name];
          }
        });
        row.appendChild(input);

        const unit = UI.el("span", "unit", meta.unit);
        row.appendChild(unit);

        const resetBtn = document.createElement("button");
        resetBtn.className = "btn-reset";
        resetBtn.textContent = "Reset";
        resetBtn.addEventListener("click", () => {
          input.value = defaultVal;
          delete editedConstants[name];
        });
        row.appendChild(resetBtn);

        group.appendChild(row);
        body.appendChild(group);
      });

      details.appendChild(body);
      container.appendChild(details);
    }
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

  async function runSimulation() {
    const chartsEl = document.getElementById("advanced-charts");
    const statusEl = document.getElementById("advanced-status");
    if (!chartsEl) return;

    if (statusEl) statusEl.innerHTML = '<div class="spinner">Running simulation\u2026</div>';
    renderChartGrid(chartsEl);

    try {
      const request = {};
      if (Object.keys(editedConstants).length > 0) {
        request.constants = { ...editedConstants };
      }
      const result = await API.simulate(request);
      if (statusEl) statusEl.innerHTML = "";

      CHART_GROUPS.forEach((group) => {
        const canvas = document.getElementById(group.id);
        if (canvas) Charts.renderSingle(canvas, result.time, result.series, group.vars);
      });
    } catch (err) {
      if (statusEl) UI.showError(statusEl, err.message);
    }
  }

  function compareWithStandard() {
    Router.go("#compare?a=standard-run&b=standard-run");
  }

  function render() {
    const accordionEl = document.getElementById("advanced-accordions");
    if (accordionEl) buildAccordions(accordionEl);

    const runBtn = document.getElementById("advanced-run");
    if (runBtn) {
      runBtn.onclick = runSimulation;
    }

    const compareBtn = document.getElementById("advanced-compare");
    if (compareBtn) {
      compareBtn.onclick = compareWithStandard;
    }
  }

  return { render };
})();
