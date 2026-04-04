/**
 * History view — the story behind The Limits to Growth.
 */

const HistoryView = (() => {
  const SECTIONS = ["cybernetics", "origin", "overshoot", "backlash", "vindication", "updates", "systems_thinking", "boundaries"];

  function render() {
    const container = document.getElementById("history-sections");
    if (!container) return;
    container.innerHTML = "";

    SECTIONS.forEach((id) => {
      const card = UI.el("div", "card mb-lg");

      const heading = document.createElement("h2");
      heading.className = "card__title";
      heading.setAttribute("data-i18n", `history.${id}.title`);
      heading.textContent = I18n.t(`history.${id}.title`);
      card.appendChild(heading);

      const body = document.createElement("div");
      body.className = "text-muted";
      body.style.lineHeight = "1.7";
      body.setAttribute("data-i18n", `history.${id}.body_html`);
      body.setAttribute("data-i18n-html", "true");
      card.appendChild(body);

      container.appendChild(card);
    });

    I18n.applyDocument(container);
  }

  return { render };
})();
