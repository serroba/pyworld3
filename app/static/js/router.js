/**
 * Minimal hash-based router.
 *
 * Routes are registered as { pattern, render(params) } where pattern is the
 * hash prefix (e.g. "#explore"). Query params are parsed and passed to render.
 */

const Router = (() => {
  const routes = [];
  const DEFAULT_HASH = "#explore?preset=standard-run&view=combined";

  function replaceHash(hash) {
    const url = `${location.pathname}${location.search}${hash}`;
    history.replaceState(null, "", url);
  }

  function parseHash() {
    const raw = location.hash || DEFAULT_HASH;
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
      replaceHash(DEFAULT_HASH);
      navigate();
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
      if (!location.hash) {
        replaceHash(DEFAULT_HASH);
      }
      navigate();
    },

    /** Programmatic navigation. */
    go(hash) {
      location.hash = hash;
    },
  };
})();
