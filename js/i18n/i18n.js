/* Hebrew-only i18n. There is no language switching any more (Arabic support
   was removed 2026-09-21i, see CLAUDE.md §12) — dir="rtl" and lang="he" are
   fixed in every page's <html> tag, so this file only resolves keys and
   applies them to the DOM. */
window.IQRAA = window.IQRAA || {};
IQRAA.i18n = IQRAA.i18n || {};

(function (ns) {
  function t(path) {
    var value = ns.i18n.translations;
    var parts = path.split(".");
    for (var i = 0; i < parts.length; i++) {
      if (value == null) return undefined;
      value = value[parts[i]];
    }
    return value;
  }

  function translatePage(root) {
    var scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = t(el.getAttribute("data-i18n"));
      if (typeof value === "string") el.textContent = value;
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var split = pair.split(":");
        var attr = split[0].trim();
        var path = split[1] ? split[1].trim() : "";
        var value = t(path);
        if (typeof value === "string") el.setAttribute(attr, value);
      });
    });
  }

  ns.i18n.t = t;
  ns.i18n.translatePage = translatePage;
})(window.IQRAA);
