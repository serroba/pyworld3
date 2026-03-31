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
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.innerHTML = `
        <div class="card__title">${UI.escapeHtml(UI.labelPreset(preset))}</div>
        <div class="card__desc">${UI.escapeHtml(UI.describePreset(preset))}</div>
      `;
      const go = () => Router.go(`#explore?preset=${encodeURIComponent(preset.name)}&view=combined`);
      card.addEventListener("click", go);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
      container.appendChild(card);
    });

    // Render "Go Deeper" resources list
    const resList = document.getElementById("intro-resources-list");
    if (resList) {
      resList.innerHTML = "";
      const resources = [
        { url: "https://www.clubofrome.org/publication/the-limits-to-growth/", text: "The Limits to Growth", desc: "Club of Rome" },
        { url: "https://en.wikipedia.org/wiki/The_Limits_to_Growth", text: "Limits to Growth: The 30-Year Update", desc: "Wikipedia" },
        { url: "https://www.sciencedirect.com/science/article/abs/pii/S0959378008000435", text: "Turner (2008)", desc: "A comparison of The Limits to Growth with 30 years of reality" },
        { url: "https://doi.org/10.1111/jiec.13084", text: "Herrington (2021)", desc: "Update to limits to growth" },
        { url: "https://www.stockholmresilience.org/research/planetary-boundaries.html", text: "Planetary Boundaries", desc: "Stockholm Resilience Centre" },
        { url: "https://open.spotify.com/episode/5Joc87wU9xDznvfuLlkz66", text: "Breaking Down: Collapse", desc: "podcast Ep. 4" },
      ];
      resources.forEach((r) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = r.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = r.text;
        li.appendChild(a);
        li.appendChild(document.createTextNode(" \u2014 " + r.desc));
        resList.appendChild(li);
      });
    }
  }

  return { render };
})();
