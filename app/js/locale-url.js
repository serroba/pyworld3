/**
 * Pure functions for locale-prefixed URL handling.
 *
 * These are testable without DOM, Router, or History API.
 */

/* exported LocaleUrl */
const LocaleUrl = (() => {
  const LOCALE_PATTERN = /^\/([a-z]{2}(?:-[A-Za-z]{2,})?)(?=\/|$)/;

  /**
   * Build a URL with the correct locale prefix.
   *
   * @param {string} locale  - The requested locale ("es", "en", "auto", etc.)
   * @param {string} path    - The base route path (e.g. "/explore")
   * @param {string} search  - Query string including "?" (e.g. "?preset=standard-run")
   * @param {string} hash    - Fragment including "#" (e.g. "#top")
   * @returns {string} The full URL path with locale prefix if needed
   */
  function buildLocaleUrl(locale, path, search, hash) {
    const prefix = (locale && locale !== "auto" && locale !== "en")
      ? "/" + locale
      : "";
    return prefix + path + (search || "") + (hash || "");
  }

  /**
   * Strip a locale prefix from a pathname.
   *
   * @param {string} pathname - The full pathname (e.g. "/es/explore")
   * @returns {{ locale: string | null, path: string }}
   */
  function stripLocalePrefix(pathname) {
    const match = pathname.match(LOCALE_PATTERN);
    if (!match) {
      return { locale: null, path: pathname };
    }
    const locale = match[1];
    const rest = pathname.slice(match[0].length);
    return {
      locale: locale,
      path: rest || "/",
    };
  }

  /**
   * Check whether the current URL needs updating for the given locale.
   *
   * @param {string} currentPathname - location.pathname
   * @param {string} currentSearch   - location.search
   * @param {string} targetUrl       - The desired URL from buildLocaleUrl
   * @returns {boolean}
   */
  function needsUpdate(currentPathname, currentSearch, targetUrl) {
    return currentPathname + currentSearch !== targetUrl.split("#")[0];
  }

  return { buildLocaleUrl, stripLocalePrefix, needsUpdate };
})();
