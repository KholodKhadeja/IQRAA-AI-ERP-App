/* Plain-JS port of components/layout/Header.tsx. */
window.IQRAA = window.IQRAA || {};
IQRAA.components = IQRAA.components || {};

IQRAA.components.header = (function (ns) {
  var PATHS = window.IQRAA_PATHS || { root: "", pages: "" };
  var NAV_ITEMS = [
    { href: PATHS.root + "index.html#services", i18nKey: "header.nav.services" },
    { href: PATHS.root + "index.html#process", i18nKey: "header.nav.process" },
    { href: PATHS.root + "index.html#contact", i18nKey: "header.nav.contact" }
  ];

  function render() {
    var navLinks = NAV_ITEMS.map(function (item) {
      return '<li><a href="' + item.href + '" class="header__nav-link" data-i18n="' + item.i18nKey + '"></a></li>';
    }).join("");

    return (
      '<header class="header">' +
      '<div class="container header__inner">' +
      '<a href="' + PATHS.root + 'index.html" class="header__brand">' +
      '<span class="header__brand-mark" aria-hidden="true">' + ns.icons.sparkles(18) + "</span>" +
      '<span class="header__brand-names">' +
      '<span class="header__brand-company">IQRAA Digital Learning</span>' +
      '<span class="header__brand-product">AI Learning Operations ERP</span>' +
      "</span></a>" +
      '<nav class="header__nav" data-i18n-attr="aria-label:header.primaryNavLabel">' +
      '<ul class="header__nav-list">' + navLinks + "</ul>" +
      "</nav>" +
      '<div class="header__actions">' +
      '<div id="header-lang-root"></div>' +
      '<a href="' + PATHS.pages + 'login.html" class="btn btn--secondary" data-i18n="header.login"></a>' +
      '<a href="' + PATHS.root + 'index.html#contact" class="btn btn--primary" data-i18n="header.talkToUs"></a>' +
      "</div>" +
      '<button type="button" class="header__menu-button" aria-expanded="false" aria-controls="mobile-menu"></button>' +
      "</div>" +
      '<div id="mobile-menu-root"></div>' +
      "</header>"
    );
  }

  function init() {
    var root = document.getElementById("header-root");
    if (!root) return;
    root.innerHTML = render();

    document.getElementById("header-lang-root").innerHTML = ns.components.languageToggle.render();
    ns.components.languageToggle.initAll(root);

    var mobileMenuRoot = document.getElementById("mobile-menu-root");
    mobileMenuRoot.innerHTML = ns.components.mobileMenu.render(NAV_ITEMS);
    ns.components.mobileMenu.init(document.getElementById("mobile-menu"));
    mobileMenuRoot.querySelector("#mobile-menu-lang-root").innerHTML = ns.components.languageToggle.render();
    ns.components.languageToggle.initAll(mobileMenuRoot);

    var menuBtn = root.querySelector(".header__menu-button");
    function syncMenuButton(isOpen) {
      menuBtn.innerHTML = isOpen ? ns.icons.x(22) : ns.icons.menu(22);
      menuBtn.setAttribute("aria-expanded", String(isOpen));
      menuBtn.setAttribute("aria-label", ns.i18n.t(isOpen ? "header.closeMenu" : "header.openMenu"));
    }
    menuBtn.addEventListener("click", function () {
      syncMenuButton(ns.components.mobileMenu.toggle());
    });
    ns.i18n.onLanguageChange(function () {
      syncMenuButton(ns.components.mobileMenu.isOpen());
    });
    syncMenuButton(false);
  }

  return { render: render, init: init };
})(window.IQRAA);
