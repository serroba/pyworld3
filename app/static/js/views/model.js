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

  function localizeSection(section) {
    const baseKey = `model.section.${section.id}`;
    return {
      ...section,
      question: I18n.t(`${baseKey}.question`, undefined, section.question),
      shortLabel: I18n.t(`${baseKey}.shortLabel`, undefined, section.shortLabel),
      summary: I18n.t(`${baseKey}.summary`, undefined, section.summary),
      concepts: (section.concepts || []).map((concept, index) => ({
        ...concept,
        term: I18n.t(`${baseKey}.concepts.${index}.term`, undefined, concept.term),
        definition: I18n.t(
          `${baseKey}.concepts.${index}.definition`,
          undefined,
          concept.definition,
        ),
      })),
      equations: section.equations
        ? {
            ...section.equations,
            preamble: I18n.t(
              `${baseKey}.equations.preamble`,
              undefined,
              section.equations.preamble,
            ),
            feedback: I18n.t(
              `${baseKey}.equations.feedback`,
              undefined,
              section.equations.feedback,
            ),
            items: section.equations.items.map((item, index) => ({
              ...item,
              label: I18n.t(
                `${baseKey}.equations.items.${index}.label`,
                undefined,
                item.label,
              ),
            })),
          }
        : undefined,
      sources: (section.sources || []).map((source, index) => ({
        ...source,
        text: I18n.t(`${baseKey}.sources.${index}.text`, undefined, source.text),
      })),
    };
  }

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
    heading.textContent = I18n.t("model.sources");
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
    outerSummary.textContent = I18n.t("model.math");
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
    innerSummary.textContent = I18n.t("model.starting_values");
    inner.appendChild(innerSummary);

    const table = document.createElement("table");
    table.className = "metrics-table";
    const thead = document.createElement("thead");
    thead.innerHTML = `<tr><th>${UI.escapeHtml(I18n.t("table.key"))}</th><th>${UI.escapeHtml(I18n.t("table.name"))}</th><th>${UI.escapeHtml(I18n.t("table.value"))}</th><th>${UI.escapeHtml(I18n.t("table.unit"))}</th></tr>`;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    constants.forEach((constantRef) => {
      const { key, label, unit, defaultValue } = constantRef;
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td><code>" + UI.escapeHtml(key) + "</code></td>" +
        "<td>" + UI.escapeHtml(UI.labelConstant(key, label)) + "</td>" +
        "<td>" + UI.formatNumber(defaultValue) + "</td>" +
        "<td>" + UI.escapeHtml(Charts.translateUnit(unit) || unit) + "</td>";
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    inner.appendChild(table);

    const link = document.createElement("p");
    link.style.cssText = "margin-top:var(--space-sm);font-size:var(--text-xs);";
    link.innerHTML = `<a href="#advanced">${UI.escapeHtml(I18n.t("action.edit_in_advanced"))} \u2192</a>`;
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
      if (container) container.innerHTML = `<p class="text-muted" style="padding:var(--space-md);">${UI.escapeHtml(I18n.t("errors.failed_chart"))}</p>`;
    }
  }

  async function fetchPreset(name) {
    if (simCache.has(name)) return simCache.get(name);
    const result = await SimulationProvider.simulatePreset(name);
    simCache.set(name, result);
    return result;
  }

  // -------------------------------------------------------------------------
  // Section DOM builder
  // -------------------------------------------------------------------------

  function buildSectionDOM(section) {
    const localizedSection = localizeSection(ModelDomain.hydrateSection(section));
    const card = UI.el("div", "model-section card");
    card.id = "section-" + localizedSection.id;

    // Question title
    const h3 = UI.el("h3", "model-section__question", localizedSection.question);
    card.appendChild(h3);

    // Plain English summary
    const summary = UI.el("p", "model-section__summary", localizedSection.summary);
    card.appendChild(summary);

    // Concept definitions
    if (localizedSection.concepts && localizedSection.concepts.length > 0) {
      card.appendChild(buildConceptsBlock(localizedSection.concepts));
    }

    // Mini chart placeholder (lazy-loaded)
    const chartPlaceholder = UI.el("div", "model-chart-placeholder");
    chartPlaceholder.setAttribute("data-section-id", localizedSection.id);
    const chartWrap = UI.el("div", "chart-container chart-container--mini");
    const canvas = document.createElement("canvas");
    canvas.id = "model-chart-" + localizedSection.id;
    chartWrap.appendChild(canvas);
    chartPlaceholder.appendChild(chartWrap);
    card.appendChild(chartPlaceholder);

    // Level 2: Equations
    if (localizedSection.equations) {
      const eqBlock = buildEquationsBlock(localizedSection.equations);

      // Level 3 (nested): Starting values
      const constBlock = buildConstantsBlock(localizedSection);
      if (constBlock) eqBlock.appendChild(constBlock);

      card.appendChild(eqBlock);
    }

    // Sources
    if (localizedSection.sources && localizedSection.sources.length > 0) {
      card.appendChild(buildSourcesBlock(localizedSection.sources));
    }

    return card;
  }

  // -------------------------------------------------------------------------
  // Assumptions section
  // -------------------------------------------------------------------------

  function renderAssumptions(container) {
    container.innerHTML = "";

    const heading = UI.el("h2", "section-title", I18n.t("model.assumptions_title"));
    container.appendChild(heading);

    const desc = UI.el("p", "text-muted mb-lg");
    desc.textContent = I18n.t("model.assumptions_desc");
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
      summary.textContent = I18n.t("model.constants_count", {
        sector: UI.labelSector(sector, sector),
        count: names.length,
      });
      details.appendChild(summary);

      const body = UI.el("div", "accordion__body");
      const table = document.createElement("table");
      table.className = "metrics-table";
      table.innerHTML = `<thead><tr><th>${UI.escapeHtml(I18n.t("table.key"))}</th><th>${UI.escapeHtml(I18n.t("table.name"))}</th><th>${UI.escapeHtml(I18n.t("table.default"))}</th><th>${UI.escapeHtml(I18n.t("table.unit"))}</th></tr></thead>`;

      const tbody = document.createElement("tbody");
      names.forEach((name) => {
        const meta = State.constantMeta[name];
        const val = State.constantDefaults[name];
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><code>" + UI.escapeHtml(name) + "</code></td>" +
          "<td>" + UI.escapeHtml(UI.labelConstant(name, meta.full_name)) + "</td>" +
          "<td>" + UI.formatNumber(val) + "</td>" +
          "<td>" + UI.escapeHtml(Charts.translateUnit(meta.unit) || meta.unit) + "</td>";
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      body.appendChild(table);

      const link = document.createElement("p");
      link.style.cssText = "margin-top:var(--space-sm);font-size:var(--text-sm);";
      link.innerHTML = `<a href="#advanced">${UI.escapeHtml(I18n.t("action.edit_in_advanced"))} \u2192</a>`;
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
    const heading = UI.el("h2", "section-title", I18n.t("model.references"));
    footer.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "ack__list";

    const refs = [
      { text: I18n.t("model.references.items.0", undefined, "Meadows, D.\u00a0H., Meadows, D.\u00a0L., Randers, J. & Behrens, W.\u00a0W. \u2014 The Limits to Growth (1972)"), url: null },
      { text: I18n.t("model.references.items.1", undefined, "Meadows, D.\u00a0L., Behrens, W.\u00a0W., Meadows, D.\u00a0H., Naill, R.\u00a0F., Randers, J. & Zahn, E. \u2014 Dynamics of Growth in a Finite World (1974)"), url: null },
      { text: I18n.t("model.references.items.2", undefined, "Meadows, D.\u00a0H., Randers, J. & Meadows, D.\u00a0L. \u2014 Limits to Growth: The 30-Year Update (2005)"), url: null },
      { text: I18n.t("model.references.items.3", undefined, "Vanwynsberghe, C. \u2014 PyWorld3 (2021)"), url: "https://github.com/cvanwynsberghe/pyworld3" },
      { text: I18n.t("model.references.items.4", undefined, "Nebel, A., Kling, A., Willamowski, R. & Schell, T. \u2014 PyWorld3-03 recalibration (2024)"), url: "https://doi.org/10.1111/jiec.13442" },
      { text: I18n.t("model.references.items.5", undefined, "Our World in Data \u2014 validation proxies"), url: "https://ourworldindata.org" },
      { text: I18n.t("model.references.items.6", undefined, "serroba/world3 \u2014 this project"), url: "https://github.com/serroba/world3" },
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
      const localizedSection = localizeSection(section);
      const pill = UI.el(
        "button",
        "pill",
        localizedSection.shortLabel || localizedSection.question,
      );
      pill.addEventListener("click", () => {
        document.getElementById("section-" + localizedSection.id)
          ?.scrollIntoView({ behavior: "smooth" });
      });
      container.appendChild(pill);
    });

    // Extra pills for bottom sections
    const assumptionsPill = UI.el("button", "pill", I18n.t("model.assumptions_pill"));
    assumptionsPill.addEventListener("click", () => {
      document.getElementById("model-assumptions")
        ?.scrollIntoView({ behavior: "smooth" });
    });
    container.appendChild(assumptionsPill);

    const sourcesPill = UI.el("button", "pill", I18n.t("model.sources"));
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
