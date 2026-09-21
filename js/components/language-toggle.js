/* Plain-JS port of components/ui/LanguageToggle.tsx.
   Deliberately a dropdown/listbox, not a toggle pill — explicit past
   correction in CLAUDE.md §4, don't revert to a segmented toggle. */
window.IQRAA = window.IQRAA || {};
IQRAA.components = IQRAA.components || {};

IQRAA.components.languageToggle = (function (ns) {
  var LANGUAGE_LABELS = { he: "עברית", ar: "العربية" };
  var instanceCount = 0;

  function render() {
    instanceCount += 1;
    var uid = "lang-toggle-" + instanceCount;
    var options = Object.keys(LANGUAGE_LABELS)
      .map(function (lang) {
        return (
          '<li><button type="button" role="option" class="lang-toggle__option" data-lang="' + lang + '">' +
          LANGUAGE_LABELS[lang] +
          "</button></li>"
        );
      })
      .join("");
    return (
      '<div class="lang-toggle" id="' + uid + '">' +
      '<button type="button" class="lang-toggle__trigger" aria-haspopup="listbox" aria-expanded="false">' +
      ns.icons.globe(16) +
      '<span data-role="current-label"></span>' +
      ns.icons.chevronDown(14) +
      "</button>" +
      '<ul class="lang-toggle__menu" role="listbox" hidden>' + options + "</ul>" +
      "</div>"
    );
  }

  function initAll(root) {
    (root || document).querySelectorAll(".lang-toggle").forEach(initOne);
  }

  function initOne(wrapper) {
    var trigger = wrapper.querySelector(".lang-toggle__trigger");
    var menu = wrapper.querySelector(".lang-toggle__menu");
    var label = wrapper.querySelector('[data-role="current-label"]');
    var options = wrapper.querySelectorAll(".lang-toggle__option");

    function syncActive() {
      var current = ns.i18n.getLanguage();
      label.textContent = LANGUAGE_LABELS[current];
      options.forEach(function (opt) {
        var isActive = opt.getAttribute("data-lang") === current;
        opt.classList.toggle("lang-toggle__option--active", isActive);
        opt.setAttribute("aria-selected", String(isActive));
      });
    }

    function open() {
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    function close() {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    }

    function handleClickOutside(event) {
      if (!wrapper.contains(event.target)) close();
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") close();
    }

    trigger.addEventListener("click", function () {
      if (menu.hidden) open();
      else close();
    });

    options.forEach(function (opt) {
      opt.addEventListener("click", function () {
        ns.i18n.setLanguage(opt.getAttribute("data-lang"));
        close();
      });
    });

    ns.i18n.onLanguageChange(syncActive);
    syncActive();
  }

  return { render: render, initAll: initAll };
})(window.IQRAA);
