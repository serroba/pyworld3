/**
 * DOM helpers and formatting utilities.
 */

const UI = (() => {
  function formatCompactNumber(value) {
    if (value === null || value === undefined || isNaN(value)) return "—";
    const abs = Math.abs(value);
    if (abs < 0.01 && abs > 0) return value.toExponential(2);
    if (abs >= 1e9) {
      return I18n.formatNumber(value, {
        notation: "compact",
        maximumFractionDigits: 2,
      });
    }
    if (abs >= 1e6) {
      return I18n.formatNumber(value, {
        notation: "compact",
        maximumFractionDigits: 2,
      });
    }
    if (abs >= 1e3) {
      return I18n.formatNumber(value, {
        notation: "compact",
        maximumFractionDigits: 1,
      });
    }
    return I18n.formatNumber(value, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return {
    /** Format a number for display (compact notation). */
    formatNumber(value) {
      return formatCompactNumber(value);
    },

    formatPercent(value, options) {
      if (value === null || value === undefined || isNaN(value)) return "—";
      const mode = options?.mode || "ratio";
      const ratio = mode === "percent" ? value / 100 : value;
      return I18n.formatPercent(ratio, {
        maximumFractionDigits: options?.maximumFractionDigits ?? 1,
      });
    },

    /** Show a loading spinner inside a container element. */
    showSpinner(container, message) {
      container.innerHTML = `<div class="spinner">${message || I18n.t("common.loading")}</div>`;
    },

    /** Create an element with optional class and text. */
    el(tag, className, text) {
      const e = document.createElement(tag);
      if (className) e.className = className;
      if (text) e.textContent = text;
      return e;
    },

    /** Create a tooltip help icon span. */
    helpIcon(tooltipText) {
      const span = document.createElement("span");
      span.className = "tooltip-trigger";
      span.setAttribute("data-tooltip", tooltipText);
      span.setAttribute("tabindex", "0");
      span.textContent = "\u24D8";
      return span;
    },

    /** Show an error message inside a container. */
    showError(container, message) {
      container.innerHTML = `<div class="card" style="border-color: var(--color-danger); color: var(--color-danger);">
        <strong>${UI.escapeHtml(I18n.t("errors.generic_prefix"))}</strong> ${UI.escapeHtml(message)}
      </div>`;
    },

    labelPreset(preset) {
      return I18n.labelForPreset(preset.name, preset.name);
    },

    describePreset(preset) {
      return I18n.descriptionForPreset(preset.name, preset.description);
    },

    labelVariable(key, fallback) {
      return I18n.labelForVariable(key, fallback);
    },

    labelConstant(key, fallback) {
      return I18n.labelForConstant(key, fallback);
    },

    labelControl(key, fallback) {
      return I18n.t(`control.${key}`, undefined, fallback ?? key);
    },

    labelSector(key, fallback) {
      return I18n.labelForSector(key, fallback);
    },

    labelConfidence(key, fallback) {
      return I18n.labelForConfidence(key, fallback);
    },

    /** Escape HTML entities. */
    escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    },
  };
})();
