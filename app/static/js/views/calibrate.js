/**
 * Calibrate & Validate view — calibrate constants from OWID data,
 * validate simulation output against observed values.
 */

const CalibrateView = (() => {
  let lastCalibration = null;

  // ---------------------------------------------------------------------------
  // Calibrate section
  // ---------------------------------------------------------------------------

  function confidenceBadge(confidence) {
    const colors = { high: "var(--color-accent)", medium: "#d97706", low: "var(--color-danger)" };
    const color = colors[confidence] || "var(--color-text-muted)";
    return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:var(--text-xs);font-weight:600;border:1px solid ${color};color:${color};">${UI.escapeHtml(UI.labelConfidence(confidence, confidence))}</span>`;
  }

  function renderCalibrationTable(container, data) {
    const entries = Object.values(data.constants);
    if (entries.length === 0) {
      container.innerHTML = `<p class="text-muted">${UI.escapeHtml(I18n.t("calibrate.no_constants"))}</p>`;
      return;
    }
    let html = `<div style="margin-bottom:var(--space-md);font-size:var(--text-sm);color:var(--color-text-muted);">
      <strong>${UI.escapeHtml(I18n.t("common.data_source"))}:</strong> <a href="https://ourworldindata.org" target="_blank" rel="noopener">Our World in Data</a> &mdash;
      ${UI.escapeHtml(I18n.t("common.entity"))}: <strong>${UI.escapeHtml(data.entity)}</strong>,
      ${UI.escapeHtml(I18n.t("common.reference_year"))}: <strong>${data.reference_year}</strong>,
      ${UI.escapeHtml(I18n.t("calibrate.constants_calibrated"))}: <strong>${entries.length}</strong>
    </div>`;
    html += `<table class="metrics-table">
      <thead><tr>
        <th>${UI.escapeHtml(I18n.t("calibrate.constant"))}</th>
        <th>${UI.escapeHtml(I18n.t("calibrate.description"))}</th>
        <th>${UI.escapeHtml(I18n.t("calibrate.owid_indicator"))}</th>
        <th>${UI.escapeHtml(I18n.t("calibrate.calibrated"))}</th>
        <th>${UI.escapeHtml(I18n.t("calibrate.default"))}</th>
        <th>${UI.escapeHtml(I18n.t("calibrate.delta_pct"))}</th>
        <th>${UI.escapeHtml(I18n.t("common.confidence"))}</th>
      </tr></thead><tbody>`;
    entries.forEach((c) => {
      const delta = c.default_value !== 0
        ? UI.formatPercent(((c.value - c.default_value) / Math.abs(c.default_value)), { maximumFractionDigits: 1 })
        : "\u2014";
      let cls = "delta-neutral";
      const deltaPct = c.default_value !== 0 ? (c.value - c.default_value) / Math.abs(c.default_value) * 100 : 0;
      if (deltaPct > 0) cls = "delta-positive";
      if (deltaPct < 0) cls = "delta-negative";
      html += `<tr>
        <td><strong>${UI.escapeHtml(UI.labelConstant(c.name, c.name))}</strong></td>
        <td style="font-size:var(--text-xs);color:var(--color-text-muted);">${UI.escapeHtml(c.description)}</td>
        <td style="font-size:var(--text-xs);"><code>${UI.escapeHtml(c.owid_indicator)}</code></td>
        <td>${UI.formatNumber(c.value)}</td>
        <td>${UI.formatNumber(c.default_value)}</td>
        <td class="${cls}">${delta}</td>
        <td>${confidenceBadge(c.confidence)}</td>
      </tr>`;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
  }

  async function runCalibration() {
    const entity = document.getElementById("calibrate-entity").value || "World";
    const year = parseInt(document.getElementById("calibrate-year").value, 10) || 1970;
    const statusEl = document.getElementById("calibrate-status");
    const resultsEl = document.getElementById("calibrate-results");
    const applyBtn = document.getElementById("calibrate-apply");

    if (statusEl) UI.showSpinner(statusEl, I18n.t("common.loading_calibrate"));
    if (resultsEl) resultsEl.innerHTML = "";
    if (applyBtn) applyBtn.style.display = "none";

    try {
      const rawData = await LocalOwidData.getCalibrationData({
        referenceYear: year,
        entity,
      });
      const data = CalibrationCore.calibrate(rawData);
      lastCalibration = data;
      if (statusEl) statusEl.innerHTML = "";
      if (resultsEl) renderCalibrationTable(resultsEl, data);
      if (applyBtn && Object.keys(data.constants).length > 0) {
        applyBtn.style.display = "";
      }
      if (data.warnings && data.warnings.length > 0) {
        const warn = UI.el("div", "text-muted mt-lg");
        warn.style.fontSize = "var(--text-sm)";
        warn.innerHTML = `<strong>${UI.escapeHtml(I18n.t("common.warnings"))}:</strong> ${data.warnings.map(UI.escapeHtml).join("; ")}`;
        if (resultsEl) resultsEl.appendChild(warn);
      }
    } catch (err) {
      if (statusEl) UI.showError(statusEl, err.message);
    }
  }

  function applyToAdvanced() {
    if (!lastCalibration) return;
    // Store calibrated constants on State for the Advanced view to pick up
    State.calibratedConstants = {};
    for (const [name, c] of Object.entries(lastCalibration.constants)) {
      State.calibratedConstants[name] = c.value;
    }
    Router.go("/advanced");
  }

  // ---------------------------------------------------------------------------
  // Validate section
  // ---------------------------------------------------------------------------

  function renderValidationTable(container, data) {
    const entries = Object.values(data.metrics);
    if (entries.length === 0) {
      container.innerHTML = `<p class="text-muted">${UI.escapeHtml(I18n.t("validate.no_metrics"))}</p>`;
      return;
    }
    let html = `<div style="margin-bottom:var(--space-md);font-size:var(--text-sm);color:var(--color-text-muted);">
      <strong>${UI.escapeHtml(I18n.t("common.data_source"))}:</strong> <a href="https://ourworldindata.org" target="_blank" rel="noopener">Our World in Data</a> &mdash;
      ${UI.escapeHtml(I18n.t("common.entity"))}: <strong>${UI.escapeHtml(data.entity)}</strong>,
      ${UI.escapeHtml(I18n.t("common.overlap"))}: <strong>${data.overlap_start}\u2013${data.overlap_end}</strong>,
      ${UI.escapeHtml(I18n.t("common.variables_compared"))}: <strong>${entries.length}</strong>
    </div>`;
    html += `<table class="metrics-table">
      <thead><tr>
        <th>${UI.escapeHtml(I18n.t("validate.variable"))}</th>
        <th>${UI.escapeHtml(I18n.t("calibrate.owid_indicator"))}</th>
        <th>${UI.escapeHtml(I18n.t("validate.rmse"))}</th>
        <th>${UI.escapeHtml(I18n.t("validate.mape"))}</th>
        <th>${UI.escapeHtml(I18n.t("validate.correlation"))}</th>
        <th>${UI.escapeHtml(I18n.t("common.points"))}</th>
        <th>${UI.escapeHtml(I18n.t("common.confidence"))}</th>
      </tr></thead><tbody>`;
    entries.forEach((m) => {
      html += `<tr>
        <td title="${UI.escapeHtml(m.description)}"><strong>${UI.escapeHtml(UI.labelVariable(m.variable, m.variable))}</strong></td>
        <td style="font-size:var(--text-xs);"><code>${UI.escapeHtml(m.owid_indicator)}</code></td>
        <td>${UI.formatNumber(m.rmse)}</td>
        <td>${UI.formatPercent(m.mape, { maximumFractionDigits: 1 })}</td>
        <td>${I18n.formatNumber(m.correlation, { maximumFractionDigits: 3, minimumFractionDigits: 3 })}</td>
        <td>${I18n.formatNumber(m.n_points, { maximumFractionDigits: 0 })}</td>
        <td>${confidenceBadge(m.confidence)}</td>
      </tr>`;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
  }

  function renderValidationCharts(container, simResult, metrics) {
    container.innerHTML = "";
    const entries = Object.values(metrics);
    entries.forEach((m) => {
      const varKey = m.variable;
      const simSeries = simResult.series[varKey];
      if (!simSeries) return;

      const panel = UI.el("div", "chart-panel");
      const header = UI.el("div", "chart-panel__header");
      const meta = State.variableMeta[varKey] || {};
      header.appendChild(UI.el("span", "chart-panel__title", UI.labelVariable(varKey, meta.full_name || varKey)));
      const wrap = UI.el("div", "chart-container");
      const canvas = document.createElement("canvas");
      canvas.id = `val-chart-${varKey}`;
      wrap.appendChild(canvas);
      panel.appendChild(header);
      panel.appendChild(wrap);
      container.appendChild(panel);

      // Build overlay chart: simulation line + observed scatter
      const simData = simResult.time.map((t, i) => ({ x: t, y: simSeries.values[i] }));
      const obsData = m.overlap_years.map((yr, i) => {
        // We don't have raw observed values in the response; show overlap range only
        return null;
      }).filter(Boolean);

      // Render simulation line using Charts.renderSingle
      Charts.renderSingle(canvas, simResult.time, simResult.series, [varKey]);
    });
  }

  async function runValidation() {
    const entity = document.getElementById("validate-entity").value || "World";
    const statusEl = document.getElementById("validate-status");
    const resultsEl = document.getElementById("validate-results");
    const chartsEl = document.getElementById("validate-charts");

    if (statusEl) UI.showSpinner(statusEl, I18n.t("common.loading_validate"));
    if (resultsEl) resultsEl.innerHTML = "";
    if (chartsEl) chartsEl.innerHTML = "";

    try {
      const simResult = await SimulationProvider.simulate({});
      const data = await ValidationCore.validate(simResult, { entity });
      if (statusEl) statusEl.innerHTML = "";
      if (resultsEl) renderValidationTable(resultsEl, data);

      try {
        if (chartsEl) renderValidationCharts(chartsEl, simResult, data.metrics);
      } catch (_) {
        // Charts are best-effort; table is the primary output
      }

      if (data.warnings && data.warnings.length > 0) {
        const warn = UI.el("div", "text-muted mt-lg");
        warn.style.fontSize = "var(--text-sm)";
        warn.innerHTML = `<strong>${UI.escapeHtml(I18n.t("common.warnings"))}:</strong> ${data.warnings.map(UI.escapeHtml).join("; ")}`;
        if (resultsEl) resultsEl.appendChild(warn);
      }
    } catch (err) {
      if (statusEl) UI.showError(statusEl, err.message);
    }
  }

  // ---------------------------------------------------------------------------
  // View entry point
  // ---------------------------------------------------------------------------

  function render() {
    const calibrateBtn = document.getElementById("calibrate-run");
    if (calibrateBtn) calibrateBtn.onclick = runCalibration;

    const applyBtn = document.getElementById("calibrate-apply");
    if (applyBtn) applyBtn.onclick = applyToAdvanced;

    const validateBtn = document.getElementById("validate-run");
    if (validateBtn) validateBtn.onclick = runValidation;
  }

  return { render };
})();
