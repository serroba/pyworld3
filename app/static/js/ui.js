/**
 * DOM helpers and formatting utilities.
 */

const UI = (() => {
  return {
    /** Format a number for display (compact notation). */
    formatNumber(value) {
      if (value == null || isNaN(value)) return "—";
      const abs = Math.abs(value);
      if (abs >= 1e9) return (value / 1e9).toFixed(2) + "B";
      if (abs >= 1e6) return (value / 1e6).toFixed(2) + "M";
      if (abs >= 1e3) return (value / 1e3).toFixed(1) + "K";
      if (abs < 0.01 && abs > 0) return value.toExponential(2);
      return value.toFixed(2);
    },

    /** Show a loading spinner inside a container element. */
    showSpinner(container, message) {
      container.innerHTML = `<div class="spinner">${message || "Loading\u2026"}</div>`;
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
        <strong>Error:</strong> ${UI.escapeHtml(message)}
      </div>`;
    },

    /** Escape HTML entities. */
    escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    },
  };
})();
