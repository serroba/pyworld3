/**
 * Global keyboard shortcuts for quick navigation.
 *
 * Alt+1..9 jump to views. Escape returns to the explore view.
 * Only activates when no input/textarea/select is focused.
 */

(function initKeyboardNav() {
  const shortcuts = {
    "1": "#intro",
    "2": "#history",
    "3": "#faq",
    "4": "#model",
    "5": "#explore",
    "6": "#compare",
    "7": "#advanced",
    "8": "#calibrate",
  };

  document.addEventListener("keydown", (e) => {
    // Don't intercept when typing in form fields
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.altKey && shortcuts[e.key]) {
      e.preventDefault();
      Router.go(shortcuts[e.key]);
    }

    if (e.key === "Escape") {
      // Close any open details/accordion
      const openDetails = document.querySelector("details[open]");
      if (openDetails) {
        openDetails.removeAttribute("open");
        openDetails.querySelector("summary")?.focus();
      }
    }
  });
})();
