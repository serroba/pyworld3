/**
 * Minimal hash-based router.
 *
 * Routes are registered as { pattern, render(params) } where pattern is the
 * hash prefix (e.g. "#explore"). Query params are parsed and passed to render.
 */

const Router = (() => {
  const routes = [];

  function parseHash() {
    const raw = location.hash || "#intro";
    const [path, qs] = raw.split("?");
    const params = {};
    if (qs) {
      for (const pair of qs.split("&")) {
        const [k, v] = pair.split("=");
        params[decodeURIComponent(k)] = decodeURIComponent(v || "");
      }
    }
    return { path, params };
  }

  function navigate() {
    const { path, params } = parseHash();

    // Hide all views
    document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));

    // Update nav links
    document.querySelectorAll(".site-nav__links a").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === path);
    });

    // Find matching route
    const route = routes.find((r) => r.pattern === path);
    if (route) {
      const viewEl = document.getElementById(route.viewId);
      if (viewEl) {
        viewEl.classList.add("active");
        route.render(params);
      }
    } else {
      // Default to intro
      const intro = document.getElementById("view-intro");
      if (intro) intro.classList.add("active");
      const introRoute = routes.find((r) => r.pattern === "#intro");
      if (introRoute) introRoute.render({});
    }
  }

  return {
    /** Register a route. viewId is the DOM id of the .view element. */
    register(pattern, viewId, renderFn) {
      routes.push({ pattern, viewId, render: renderFn });
    },

    /** Start listening for hash changes. */
    start() {
      window.addEventListener("hashchange", navigate);
      navigate();
    },

    /** Programmatic navigation. */
    go(hash) {
      location.hash = hash;
    },
  };
})();
