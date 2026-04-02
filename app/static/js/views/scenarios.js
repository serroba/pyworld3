/**
 * SEO content page — World3 scenarios explained.
 */

const ScenariosView = (() => {
  function render() {
    const container = document.getElementById("view-scenarios");
    if (!container) return;
    I18n.applyDocument(container);
  }

  return { render };
})();
