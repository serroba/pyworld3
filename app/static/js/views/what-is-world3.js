/**
 * SEO content page — What is the World3 model?
 */

const WhatIsWorld3View = (() => {
  function render() {
    const container = document.getElementById("view-what-is-world3");
    if (!container) return;
    I18n.applyDocument(container);
  }

  return { render };
})();
