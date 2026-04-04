/**
 * SEO content page — The Limits to Growth book and study.
 */

const LimitsToGrowthView = (() => {
  function render() {
    const container = document.getElementById("view-limits-to-growth");
    if (!container) return;
    I18n.applyDocument(container);
  }

  return { render };
})();
