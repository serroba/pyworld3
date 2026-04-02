/**
 * Minimal path-based router using the History API.
 *
 * Routes are registered as { pattern, render(params) } where pattern is a
 * pathname prefix (e.g. "/explore"). Query params are parsed and passed to render.
 *
 * Falls back to hash-based URLs for backwards compatibility: if the page loads
 * with a hash like #explore, it redirects to /explore.
 */

const Router = (() => {
  const routes = [];
  const DEFAULT_PATH = "/explore?preset=standard-run&view=combined";

  function parsePath() {
    let pathname = location.pathname;
    let qs = location.search.replace(/^\?/, "");

    // Backwards compat: redirect old hash URLs to path URLs
    if (location.hash && location.hash.length > 1) {
      const [hashPath, hashQs] = location.hash.substring(1).split("?");
      // Ensure leading slash
      const normalizedPath = hashPath.startsWith("/") ? hashPath : "/" + hashPath;
      const newUrl = normalizedPath + (hashQs ? "?" + hashQs : "");
      history.replaceState(null, "", newUrl);
      pathname = normalizedPath;
      qs = hashQs || "";
    }

    // Normalise: strip trailing slash (except root)
    if (pathname !== "/" && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }

    // Root serves the intro/home view (not a redirect)
    if (pathname === "/" || pathname === "") {
      pathname = "/";
    }

    const params = {};
    if (qs) {
      for (const pair of qs.split("&")) {
        const [k, v] = pair.split("=");
        params[decodeURIComponent(k)] = decodeURIComponent(v || "");
      }
    }
    return { path: pathname, params };
  }

  function navigate() {
    const { path, params } = parsePath();

    // Hide all views
    document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));

    // Update nav links
    document.querySelectorAll(".site-nav__links a").forEach((a) => {
      const href = a.getAttribute("href");
      a.classList.toggle("active", href === path);
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
      // Unknown path — redirect to default
      history.replaceState(null, "", DEFAULT_PATH);
      navigate();
    }
  }

  // Intercept link clicks for SPA navigation
  document.addEventListener("click", (e) => {
    // Skip modified clicks (Cmd/Ctrl+click, middle click, Shift+click)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const link = e.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("//") || href.startsWith("mailto:") || href.startsWith("#")) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;
    if (!href.startsWith("/")) return;
    e.preventDefault();
    history.pushState(null, "", href);
    navigate();
  });

  return {
    /** Register a route. viewId is the DOM id of the .view element. */
    register(pattern, viewId, renderFn) {
      routes.push({ pattern, viewId, render: renderFn });
    },

    /** Start listening for navigation events. */
    start() {
      window.addEventListener("popstate", navigate);
      navigate();
    },

    /** Re-render the active route without mutating the URL. */
    refresh() {
      navigate();
    },

    /** Programmatic navigation. */
    go(path) {
      history.pushState(null, "", path);
      navigate();
    },

    replace(path) {
      history.replaceState(null, "", path);
      navigate();
    },
  };
})();
