/* Plain-JS port of src/i18n/LanguageContext.tsx.
   dir is never touched here — it stays fixed as <html dir="rtl"> in every
   page (both Hebrew and Arabic are RTL, see CLAUDE.md §4). */
window.IQRAA = window.IQRAA || {};
IQRAA.i18n = IQRAA.i18n || {};

(function (ns) {
  var STORAGE_KEY = "iqraa-language";
  var listeners = [];
  var current = readStoredLanguage();

  function readStoredLanguage() {
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      return stored === "ar" ? "ar" : "he";
    } catch {
      return "he";
    }
  }

  document.documentElement.lang = current;

  function t(path) {
    var value = ns.i18n.translations[current];
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

  function setLanguage(lang) {
    current = lang === "ar" ? "ar" : "he";
    document.documentElement.lang = current;
    try {
      window.localStorage.setItem(STORAGE_KEY, current);
    } catch {
      /* localStorage unavailable — language just won't persist */
    }
    translatePage();
    listeners.forEach(function (fn) {
      fn(current);
    });
  }

  ns.i18n.t = t;
  ns.i18n.translatePage = translatePage;
  ns.i18n.setLanguage = setLanguage;
  ns.i18n.getLanguage = function () {
    return current;
  };
  ns.i18n.onLanguageChange = function (fn) {
    listeners.push(fn);
  };
})(window.IQRAA);
