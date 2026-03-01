/**
 * Intro view — welcome screen with World3 explanation and preset cards.
 */

const IntroView = (() => {
  function render() {
    const container = document.getElementById("intro-presets");
    if (!container) return;

    container.innerHTML = "";
    State.presets.forEach((preset) => {
      const card = UI.el("div", "card card--clickable");
      card.innerHTML = `
        <div class="card__title">${UI.escapeHtml(preset.name)}</div>
        <div class="card__desc">${UI.escapeHtml(preset.description)}</div>
      `;
      card.addEventListener("click", () => {
        Router.go(`#explore?preset=${encodeURIComponent(preset.name)}`);
      });
      container.appendChild(card);
    });
  }

  return { render };
})();
