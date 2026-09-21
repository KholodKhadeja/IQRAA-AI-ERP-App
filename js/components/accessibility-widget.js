/* Plain-JS port of components/accessibility/AccessibilityWidget.tsx.
   Persists to localStorage["iqraa-a11y-settings"], applies data-a11y-*
   attributes on <html> — see css/global.css for how those attributes
   change rendering (text scale, high contrast, underline links). */
window.IQRAA = window.IQRAA || {};
IQRAA.components = IQRAA.components || {};

IQRAA.components.accessibilityWidget = (function (ns) {
  var PATHS = window.IQRAA_PATHS || { root: "", pages: "" };
  var STORAGE_KEY = "iqraa-a11y-settings";
  var FONT_SCALES = [1, 2, 3];
  var DEFAULT_SETTINGS = { fontScale: 1, highContrast: false, underlineLinks: false };

  var settings = readStoredSettings();
  var isOpenState = false;
  var els = null;

  function readStoredSettings() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return Object.assign({}, DEFAULT_SETTINGS);
      var parsed = JSON.parse(raw);
      return {
        fontScale: FONT_SCALES.indexOf(parsed.fontScale) !== -1 ? parsed.fontScale : 1,
        highContrast: Boolean(parsed.highContrast),
        underlineLinks: Boolean(parsed.underlineLinks)
      };
    } catch {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function applySettings() {
    var root = document.documentElement;
    root.setAttribute("data-a11y-font-scale", String(settings.fontScale));
    if (settings.highContrast) root.setAttribute("data-a11y-contrast", "high");
    else root.removeAttribute("data-a11y-contrast");
    if (settings.underlineLinks) root.setAttribute("data-a11y-underline-links", "true");
    else root.removeAttribute("data-a11y-underline-links");
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* localStorage unavailable — settings just won't persist */
    }
  }

  function render() {
    return (
      '<div class="a11y-widget" id="a11y-widget">' +
      '<div class="a11y-widget__panel" role="dialog" aria-modal="false" data-i18n-attr="aria-label:a11yWidget.title" hidden>' +
      '<div class="a11y-widget__panel-header">' +
      '<span class="a11y-widget__panel-title" data-i18n="a11yWidget.title"></span>' +
      '<button type="button" class="a11y-widget__close" data-i18n-attr="aria-label:a11yWidget.close">' + ns.icons.x(18) + "</button>" +
      "</div>" +
      '<div class="a11y-widget__row">' +
      '<span class="a11y-widget__row-label" data-i18n="a11yWidget.textSize"></span>' +
      '<div class="a11y-widget__stepper">' +
      '<button type="button" data-action="decrease" data-i18n-attr="aria-label:a11yWidget.decreaseText">' + ns.icons.minus(16) + "</button>" +
      '<button type="button" data-action="increase" data-i18n-attr="aria-label:a11yWidget.increaseText">' + ns.icons.plus(16) + "</button>" +
      "</div></div>" +
      '<button type="button" class="a11y-widget__toggle-row" data-action="contrast" aria-pressed="false">' +
      ns.icons.contrast(16) + '<span data-i18n="a11yWidget.highContrast"></span></button>' +
      '<button type="button" class="a11y-widget__toggle-row" data-action="underline" aria-pressed="false">' +
      ns.icons.underline(16) + '<span data-i18n="a11yWidget.underlineLinks"></span></button>' +
      '<button type="button" class="a11y-widget__reset-row" data-action="reset">' +
      ns.icons.rotateCcw(16) + '<span data-i18n="a11yWidget.reset"></span></button>' +
      '<a href="' + PATHS.pages + 'accessibility.html" class="a11y-widget__statement-link" data-i18n="a11yWidget.statementLink"></a>' +
      "</div>" +
      '<button type="button" class="a11y-widget__trigger" aria-haspopup="dialog" aria-expanded="false" data-i18n-attr="aria-label:a11yWidget.toggleLabel">' +
      ns.icons.accessibility(24) +
      "</button>" +
      "</div>"
    );
  }

  function syncPanelState() {
    if (!els) return;
    var decreaseBtn = els.panel.querySelector('[data-action="decrease"]');
    var increaseBtn = els.panel.querySelector('[data-action="increase"]');
    var contrastBtn = els.panel.querySelector('[data-action="contrast"]');
    var underlineBtn = els.panel.querySelector('[data-action="underline"]');

    decreaseBtn.disabled = settings.fontScale === FONT_SCALES[0];
    increaseBtn.disabled = settings.fontScale === FONT_SCALES[FONT_SCALES.length - 1];

    contrastBtn.classList.toggle("a11y-widget__toggle-row--active", settings.highContrast);
    contrastBtn.setAttribute("aria-pressed", String(settings.highContrast));
    underlineBtn.classList.toggle("a11y-widget__toggle-row--active", settings.underlineLinks);
    underlineBtn.setAttribute("aria-pressed", String(settings.underlineLinks));
  }

  function open() {
    isOpenState = true;
    els.panel.hidden = false;
    els.trigger.setAttribute("aria-expanded", "true");
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
  }

  function close() {
    isOpenState = false;
    els.panel.hidden = true;
    els.trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleKeyDown);
  }

  function handleClickOutside(event) {
    if (els && !els.wrapper.contains(event.target)) close();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") close();
  }

  function changeFontScale(direction) {
    var currentIndex = FONT_SCALES.indexOf(settings.fontScale);
    var nextIndex = Math.min(Math.max(currentIndex + direction, 0), FONT_SCALES.length - 1);
    settings.fontScale = FONT_SCALES[nextIndex];
    applySettings();
    syncPanelState();
  }

  function init() {
    var root = document.getElementById("a11y-widget-root");
    if (!root) return;
    root.innerHTML = render();

    els = {
      wrapper: root.querySelector(".a11y-widget"),
      panel: root.querySelector(".a11y-widget__panel"),
      trigger: root.querySelector(".a11y-widget__trigger")
    };

    applySettings();
    syncPanelState();

    els.trigger.addEventListener("click", function () {
      if (isOpenState) close();
      else open();
    });
    els.panel.querySelector(".a11y-widget__close").addEventListener("click", close);
    els.panel.querySelector('[data-action="decrease"]').addEventListener("click", function () {
      changeFontScale(-1);
    });
    els.panel.querySelector('[data-action="increase"]').addEventListener("click", function () {
      changeFontScale(1);
    });
    els.panel.querySelector('[data-action="contrast"]').addEventListener("click", function () {
      settings.highContrast = !settings.highContrast;
      applySettings();
      syncPanelState();
    });
    els.panel.querySelector('[data-action="underline"]').addEventListener("click", function () {
      settings.underlineLinks = !settings.underlineLinks;
      applySettings();
      syncPanelState();
    });
    els.panel.querySelector('[data-action="reset"]').addEventListener("click", function () {
      settings = Object.assign({}, DEFAULT_SETTINGS);
      applySettings();
      syncPanelState();
    });
    els.panel.querySelector(".a11y-widget__statement-link").addEventListener("click", close);
  }

  return { init: init };
})(window.IQRAA);
