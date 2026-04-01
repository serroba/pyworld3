/**
 * Application bootstrap — load metadata, register routes, start router.
 */

(async function boot() {
  const shell = document.getElementById("app-shell");
  if (!shell) return;

  try {
    await I18n.init();
    initLanguagePicker();
    I18n.applyDocument();
    await State.init();
  } catch (_err) {
    shell.innerHTML = `<div class="container mt-xl">
      <div class="card" style="border-color: var(--color-danger); color: var(--color-danger);">
        <strong>${UI.escapeHtml(I18n.t("errors.init_failed_title"))}</strong><br>
        ${UI.escapeHtml(I18n.t("errors.init_failed_body"))}
      </div>
    </div>`;
    return;
  }

  // Register routes
  Router.register("/", "view-intro", IntroView.render);
  Router.register("/history", "view-history", HistoryView.render);
  Router.register("/faq", "view-faq", FaqView.render);
  Router.register("/model", "view-model", ModelView.render);
  Router.register("/explore", "view-explore", ExploreView.render);
  Router.register("/compare", "view-compare", CompareView.render);
  Router.register("/advanced", "view-advanced", AdvancedView.render);
  Router.register("/calibrate", "view-calibrate", CalibrateView.render);

  Router.start();

  window.addEventListener("world3:localechange", () => {
    syncLanguagePicker();
    I18n.applyDocument();
    Router.refresh();
  });
})();

function initLanguagePicker() {
  const picker = document.getElementById("locale-picker");
  if (!(picker instanceof HTMLSelectElement)) {
    return;
  }

  picker.innerHTML = "";

  const autoOption = document.createElement("option");
  autoOption.value = "auto";
  autoOption.textContent = I18n.t("nav.language_auto");
  picker.appendChild(autoOption);

  I18n.getSupportedLocales().forEach((locale) => {
    const option = document.createElement("option");
    option.value = locale.code;
    option.textContent = locale.nativeLabel;
    picker.appendChild(option);
  });

  picker.addEventListener("change", async () => {
    await I18n.setLocale(picker.value);
  });

  syncLanguagePicker();
}

function syncLanguagePicker() {
  const picker = document.getElementById("locale-picker");
  if (!(picker instanceof HTMLSelectElement)) {
    return;
  }
  picker.value = I18n.getLocale();
}
