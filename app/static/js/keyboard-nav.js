/**
 * Global keyboard shortcuts for quick navigation.
 *
 * Alt+1..8 jump to views. Escape closes accordions or the help dialog.
 * ? opens the keyboard shortcut reference overlay.
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

  const shortcutDescriptions = [
    { keys: "?", desc: "Show this help" },
    { keys: "Alt + 1", desc: "Home" },
    { keys: "Alt + 2", desc: "History" },
    { keys: "Alt + 3", desc: "FAQ" },
    { keys: "Alt + 4", desc: "Model" },
    { keys: "Alt + 5", desc: "Explore" },
    { keys: "Alt + 6", desc: "Compare" },
    { keys: "Alt + 7", desc: "Advanced" },
    { keys: "Alt + 8", desc: "Calibrate" },
    { keys: "Esc", desc: "Close dialog / accordion" },
    { keys: "Tab", desc: "Move focus forward" },
    { keys: "Shift + Tab", desc: "Move focus backward" },
    { keys: "Enter / Space", desc: "Activate focused element" },
  ];

  let dialog = null;

  function createDialog() {
    const overlay = document.createElement("div");
    overlay.className = "kbd-help-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Keyboard shortcuts");
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog();
    });

    const panel = document.createElement("div");
    panel.className = "kbd-help-panel";

    const heading = document.createElement("h2");
    heading.textContent = "Keyboard Shortcuts";
    heading.style.marginBottom = "var(--space-md)";
    panel.appendChild(heading);

    const list = document.createElement("dl");
    list.className = "kbd-help-list";
    shortcutDescriptions.forEach(({ keys, desc }) => {
      const row = document.createElement("div");
      row.className = "kbd-help-row";

      const dt = document.createElement("dt");
      keys.split(" + ").forEach((k, i) => {
        if (i > 0) dt.appendChild(document.createTextNode(" + "));
        const kbd = document.createElement("kbd");
        kbd.textContent = k.trim();
        dt.appendChild(kbd);
      });
      row.appendChild(dt);

      const dd = document.createElement("dd");
      dd.textContent = desc;
      row.appendChild(dd);

      list.appendChild(row);
    });
    panel.appendChild(list);

    const closeBtn = document.createElement("button");
    closeBtn.className = "btn btn-outline btn-sm";
    closeBtn.textContent = "Close";
    closeBtn.style.marginTop = "var(--space-md)";
    closeBtn.addEventListener("click", closeDialog);
    panel.appendChild(closeBtn);

    overlay.appendChild(panel);
    return overlay;
  }

  function openDialog() {
    if (dialog) return;
    dialog = createDialog();
    document.body.appendChild(dialog);
    dialog.querySelector("button").focus();
  }

  function closeDialog() {
    if (!dialog) return;
    dialog.remove();
    dialog = null;
  }

  document.addEventListener("keydown", (e) => {
    // Escape closes dialog first, then accordions
    if (e.key === "Escape") {
      if (dialog) { closeDialog(); return; }
      const openDetails = document.querySelector("details[open]");
      if (openDetails) {
        openDetails.removeAttribute("open");
        openDetails.querySelector("summary")?.focus();
      }
      return;
    }

    // Don't intercept when typing in form fields
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    // ? opens help
    if (e.key === "?" || (e.shiftKey && e.key === "/")) {
      e.preventDefault();
      if (dialog) closeDialog(); else openDialog();
      return;
    }

    // Alt+number navigation
    if (e.altKey && shortcuts[e.key]) {
      e.preventDefault();
      if (dialog) closeDialog();
      Router.go(shortcuts[e.key]);
    }
  });
})();
