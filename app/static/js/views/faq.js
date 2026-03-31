/**
 * FAQ view — common misconceptions about The Limits to Growth.
 */

const FaqView = (() => {
  const ITEMS = ["ran_out", "technology_saves", "too_simple", "malthus", "no_collapse_yet"];

  function render() {
    const container = document.getElementById("faq-sections");
    if (!container) return;
    container.innerHTML = "";

    ITEMS.forEach((id) => {
      const details = document.createElement("details");
      details.className = "accordion";

      const summary = document.createElement("summary");
      summary.setAttribute("data-i18n", `faq.${id}.question`);
      summary.textContent = I18n.t(`faq.${id}.question`);
      details.appendChild(summary);

      const body = document.createElement("div");
      body.className = "accordion__body";
      body.setAttribute("data-i18n", `faq.${id}.answer_html`);
      body.setAttribute("data-i18n-html", "true");
      details.appendChild(body);

      container.appendChild(details);
    });

    I18n.applyDocument(container);
  }

  return { render };
})();
