/**
 * Application bootstrap — load metadata, register routes, start router.
 */

(async function boot() {
  const shell = document.getElementById("app-shell");
  if (!shell) return;

  try {
    await State.init();
  } catch (_err) {
    shell.innerHTML = `<div class="container mt-xl">
      <div class="card" style="border-color: var(--color-danger); color: var(--color-danger);">
        <strong>Failed to initialize the browser-native app.</strong><br>
        Reload the page and check that static data assets are available.
      </div>
    </div>`;
    return;
  }

  // Register routes
  Router.register("#intro", "view-intro", IntroView.render);
  Router.register("#model", "view-model", ModelView.render);
  Router.register("#explore", "view-explore", ExploreView.render);
  Router.register("#compare", "view-compare", CompareView.render);
  Router.register("#advanced", "view-advanced", AdvancedView.render);
  Router.register("#calibrate", "view-calibrate", CalibrateView.render);

  Router.start();
})();
