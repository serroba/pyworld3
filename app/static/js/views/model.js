/**
 * Model view — explains how World3 works through big questions, concepts,
 * embedded mini-charts, progressive math disclosure, and assumptions.
 */

const ModelView = (() => {
  /** Cache simulation results so navigating away and back doesn't re-fetch. */
  const simCache = new Map();

  /** IntersectionObserver for lazy-loading charts. */
  let observer = null;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function buildConceptsBlock(concepts) {
    const wrap = UI.el("div", "model-concepts");
    concepts.forEach((c) => {
      const item = UI.el("div", "model-concept");
      const term = document.createElement("strong");
      term.textContent = c.term;
      item.appendChild(term);
      const def = document.createElement("p");
      def.textContent = c.definition;
      item.appendChild(def);
      wrap.appendChild(item);
    });
    return wrap;
  }

  function buildSourcesBlock(sources) {
    const wrap = UI.el("div", "model-section__sources");
    const heading = document.createElement("strong");
    heading.textContent = "Sources";
    wrap.appendChild(heading);
    const list = document.createElement("ul");
    sources.forEach((s) => {
      const li = document.createElement("li");
      if (s.url) {
        const a = document.createElement("a");
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = s.text;
        li.appendChild(a);
      } else {
        li.textContent = s.text;
      }
      list.appendChild(li);
    });
    wrap.appendChild(list);
    return wrap;
  }

  function buildEquationsBlock(eq) {
    const outer = document.createElement("details");
    const outerSummary = document.createElement("summary");
    outerSummary.textContent = "How does the math work?";
    outer.appendChild(outerSummary);

    const preamble = document.createElement("p");
    preamble.className = "explainer-text";
    preamble.textContent = eq.preamble;
    outer.appendChild(preamble);

    eq.items.forEach((item) => {
      const block = UI.el("div", "eq-block");
      const label = UI.el("span", "eq-label", item.label + ": ");
      block.appendChild(label);
      const eqSpan = document.createElement("span");
      eqSpan.className = "eq";
      eqSpan.innerHTML = item.html;
      block.appendChild(eqSpan);
      outer.appendChild(block);
    });

    if (eq.feedback) {
      const fb = document.createElement("p");
      fb.className = "model-section__feedback";
      fb.textContent = eq.feedback;
      outer.appendChild(fb);
    }

    return outer;
  }

  function buildConstantsBlock(section) {
    const constants = section.constants;
    if (!constants || constants.length === 0) return null;

    const inner = document.createElement("details");
    const innerSummary = document.createElement("summary");
    innerSummary.textContent = "What are the starting values?";
    inner.appendChild(innerSummary);

    const table = document.createElement("table");
    table.className = "metrics-table";
    const thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>Key</th><th>Name</th><th>Value</th><th>Unit</th></tr>";
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    constants.forEach((c) => {
      const meta = State.constantMeta[c.key];
      const val = State.constantDefaults[c.key];
      if (!meta) return; // skip if constant not found in metadata
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td><code>" + UI.escapeHtml(c.key) + "</code></td>" +
        "<td>" + UI.escapeHtml(meta.full_name) + "</td>" +
        "<td>" + UI.formatNumber(val) + "</td>" +
        "<td>" + UI.escapeHtml(meta.unit) + "</td>";
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    inner.appendChild(table);

    const link = document.createElement("p");
    link.style.cssText = "margin-top:var(--space-sm);font-size:var(--text-xs);";
    link.innerHTML = '<a href="#advanced">Edit these in the Advanced editor \u2192</a>';
    inner.appendChild(link);

    return inner;
  }

  // -------------------------------------------------------------------------
  // Chart loading
  // -------------------------------------------------------------------------

  async function loadSectionChart(sectionId) {
    const section = MODEL_SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    const canvas = document.getElementById("model-chart-" + sectionId);
    if (!canvas) return;

    // Already rendered?
    if (Chart.getChart(canvas)) return;

    try {
      if (section.preset === "compare" && section.comparePresets) {
        const [presetA, presetB] = section.comparePresets;
        const [resultA, resultB] = await Promise.all([
          fetchPreset(presetA),
          fetchPreset(presetB),
        ]);
        Charts.renderCompare(canvas, resultA, resultB, section.chartVars, presetA, presetB);
      } else {
        const result = await fetchPreset(section.preset);
        Charts.renderSingle(canvas, result.time, result.series, section.chartVars);
      }
    } catch (_err) {
      const container = canvas.parentElement;
      if (container) container.innerHTML = '<p class="text-muted" style="padding:var(--space-md);">Failed to load chart.</p>';
    }
  }

  async function fetchPreset(name) {
    if (simCache.has(name)) return simCache.get(name);
    const result = await API.simulatePreset(name);
    simCache.set(name, result);
    return result;
  }

  // -------------------------------------------------------------------------
  // Section DOM builder
  // -------------------------------------------------------------------------

  function buildSectionDOM(section) {
    const card = UI.el("div", "model-section card");
    card.id = "section-" + section.id;

    // Question title
    const h3 = UI.el("h3", "model-section__question", section.question);
    card.appendChild(h3);

    // Plain English summary
    const summary = UI.el("p", "model-section__summary", section.summary);
    card.appendChild(summary);

    // Concept definitions
    if (section.concepts && section.concepts.length > 0) {
      card.appendChild(buildConceptsBlock(section.concepts));
    }

    // Mini chart placeholder (lazy-loaded)
    const chartPlaceholder = UI.el("div", "model-chart-placeholder");
    chartPlaceholder.setAttribute("data-section-id", section.id);
    const chartWrap = UI.el("div", "chart-container chart-container--mini");
    const canvas = document.createElement("canvas");
    canvas.id = "model-chart-" + section.id;
    chartWrap.appendChild(canvas);
    chartPlaceholder.appendChild(chartWrap);
    card.appendChild(chartPlaceholder);

    // Level 2: Equations
    if (section.equations) {
      const eqBlock = buildEquationsBlock(section.equations);

      // Level 3 (nested): Starting values
      const constBlock = buildConstantsBlock(section);
      if (constBlock) eqBlock.appendChild(constBlock);

      card.appendChild(eqBlock);
    }

    // Sources
    if (section.sources && section.sources.length > 0) {
      card.appendChild(buildSourcesBlock(section.sources));
    }

    return card;
  }

  // -------------------------------------------------------------------------
  // Assumptions section
  // -------------------------------------------------------------------------

  function renderAssumptions(container) {
    container.innerHTML = "";

    const heading = UI.el("h2", "section-title", "All model assumptions");
    container.appendChild(heading);

    const desc = UI.el("p", "text-muted mb-lg");
    desc.textContent =
      "Every constant below is a starting assumption of the World3 model. " +
      "They are grouped by sector. You can edit any of them in the Advanced editor.";
    container.appendChild(desc);

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
      summary.textContent = sector + " (" + names.length + " constants)";
      details.appendChild(summary);

      const body = UI.el("div", "accordion__body");
      const table = document.createElement("table");
      table.className = "metrics-table";
      table.innerHTML = "<thead><tr><th>Key</th><th>Name</th><th>Default</th><th>Unit</th></tr></thead>";

      const tbody = document.createElement("tbody");
      names.forEach((name) => {
        const meta = State.constantMeta[name];
        const val = State.constantDefaults[name];
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><code>" + UI.escapeHtml(name) + "</code></td>" +
          "<td>" + UI.escapeHtml(meta.full_name) + "</td>" +
          "<td>" + UI.formatNumber(val) + "</td>" +
          "<td>" + UI.escapeHtml(meta.unit) + "</td>";
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      body.appendChild(table);

      const link = document.createElement("p");
      link.style.cssText = "margin-top:var(--space-sm);font-size:var(--text-sm);";
      link.innerHTML = '<a href="#advanced">Edit in Advanced editor \u2192</a>';
      body.appendChild(link);

      details.appendChild(body);
      container.appendChild(details);
    }
  }

  // -------------------------------------------------------------------------
  // Global sources section
  // -------------------------------------------------------------------------

  function renderGlobalSources(container) {
    container.innerHTML = "";

    const footer = UI.el("footer", "ack");
    const heading = UI.el("h2", "section-title", "References & Sources");
    footer.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "ack__list";

    const refs = [
      { text: "Meadows, D.\u00a0H., Meadows, D.\u00a0L., Randers, J. & Behrens, W.\u00a0W. \u2014 The Limits to Growth (1972)", url: null },
      { text: "Meadows, D.\u00a0L., Behrens, W.\u00a0W., Meadows, D.\u00a0H., Naill, R.\u00a0F., Randers, J. & Zahn, E. \u2014 Dynamics of Growth in a Finite World (1974)", url: null },
      { text: "Meadows, D.\u00a0H., Randers, J. & Meadows, D.\u00a0L. \u2014 Limits to Growth: The 30-Year Update (2005)", url: null },
      { text: "Vanwynsberghe, C. \u2014 PyWorld3 (2021)", url: "https://github.com/cvanwynsberghe/pyworld3" },
      { text: "Nebel, A., Kling, A., Willamowski, R. & Schell, T. \u2014 PyWorld3-03 recalibration (2024)", url: "https://doi.org/10.1111/jiec.13442" },
      { text: "Our World in Data \u2014 validation proxies", url: "https://ourworldindata.org" },
      { text: "serroba/pyworld3 \u2014 this project", url: "https://github.com/serroba/pyworld3" },
    ];

    refs.forEach((ref) => {
      const li = document.createElement("li");
      if (ref.url) {
        const a = document.createElement("a");
        a.href = ref.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = ref.text;
        li.appendChild(a);
      } else {
        li.textContent = ref.text;
      }
      list.appendChild(li);
    });

    footer.appendChild(list);
    container.appendChild(footer);
  }

  // -------------------------------------------------------------------------
  // IntersectionObserver for lazy chart loading
  // -------------------------------------------------------------------------

  function observeCharts() {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute("data-section-id");
            if (sectionId) loadSectionChart(sectionId);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "200px" }
    );

    document.querySelectorAll(".model-chart-placeholder").forEach((el) => {
      observer.observe(el);
    });
  }

  // -------------------------------------------------------------------------
  // Nav pills
  // -------------------------------------------------------------------------

  function renderNavPills(container) {
    container.innerHTML = "";
    MODEL_SECTIONS.forEach((section) => {
      const pill = UI.el("button", "pill", section.shortLabel || section.question);
      pill.addEventListener("click", () => {
        document.getElementById("section-" + section.id)
          ?.scrollIntoView({ behavior: "smooth" });
      });
      container.appendChild(pill);
    });

    // Extra pills for bottom sections
    const assumptionsPill = UI.el("button", "pill", "Assumptions");
    assumptionsPill.addEventListener("click", () => {
      document.getElementById("model-assumptions")
        ?.scrollIntoView({ behavior: "smooth" });
    });
    container.appendChild(assumptionsPill);

    const sourcesPill = UI.el("button", "pill", "Sources");
    sourcesPill.addEventListener("click", () => {
      document.getElementById("model-sources")
        ?.scrollIntoView({ behavior: "smooth" });
    });
    container.appendChild(sourcesPill);
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  function render() {
    const navContainer = document.getElementById("model-nav-pills");
    if (navContainer) renderNavPills(navContainer);

    const sectionsContainer = document.getElementById("model-sections");
    if (sectionsContainer) {
      sectionsContainer.innerHTML = "";
      MODEL_SECTIONS.forEach((section) => {
        sectionsContainer.appendChild(buildSectionDOM(section));
      });
    }

    const assumptionsContainer = document.getElementById("model-assumptions");
    if (assumptionsContainer) renderAssumptions(assumptionsContainer);

    const sourcesContainer = document.getElementById("model-sources");
    if (sourcesContainer) renderGlobalSources(sourcesContainer);

    // Start observing chart placeholders for lazy loading
    observeCharts();
  }

  return { render };
})();
