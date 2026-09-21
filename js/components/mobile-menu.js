/* Plain-JS port of components/navigation/MobileMenu.tsx. */
window.IQRAA = window.IQRAA || {};
IQRAA.components = IQRAA.components || {};

IQRAA.components.mobileMenu = (function (ns) {
  var PATHS = window.IQRAA_PATHS || { root: "", pages: "" };
  var isOpenState = false;
  var els = null;

  function render(navItems) {
    var links = navItems
      .map(function (item, index) {
        return (
          '<li><a href="' + item.href + '" class="mobile-menu__nav-link" data-i18n="' + item.i18nKey + '"' +
          (index === 0 ? ' data-first-link="true"' : "") + "></a></li>"
        );
      })
      .join("");
    return (
      '<div class="mobile-menu-overlay" id="mobile-menu">' +
      '<div class="mobile-menu__panel" role="dialog" aria-modal="true" data-i18n-attr="aria-label:mobileMenu.ariaLabel">' +
      '<div class="mobile-menu__header">' +
      '<span class="mobile-menu__brand">IQRAA Digital Learning</span>' +
      '<button type="button" class="mobile-menu__close" data-i18n-attr="aria-label:header.closeMenu"></button>' +
      "</div>" +
      '<nav data-i18n-attr="aria-label:mobileMenu.navAriaLabel">' +
      '<ul class="mobile-menu__nav-list">' + links + "</ul>" +
      "</nav>" +
      '<div class="mobile-menu__actions">' +
      '<a href="' + PATHS.pages + 'login.html" class="btn btn--secondary btn--full-width" data-i18n="header.login"></a>' +
      '<a href="' + PATHS.root + 'index.html#contact" class="btn btn--primary btn--full-width" data-i18n="header.talkToUs"></a>' +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") close();
  }

  function open() {
    if (!els) return;
    isOpenState = true;
    els.overlay.classList.add("is-open");
    els.closeBtn.innerHTML = ns.icons.x(22);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    var firstLink = els.overlay.querySelector('[data-first-link="true"]');
    if (firstLink) firstLink.focus();
  }

  function close() {
    if (!els) return;
    isOpenState = false;
    els.overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleKeyDown);
  }

  function toggle() {
    if (isOpenState) close();
    else open();
    return isOpenState;
  }

  function isOpen() {
    return isOpenState;
  }

  function init(overlayEl) {
    els = {
      overlay: overlayEl,
      closeBtn: overlayEl.querySelector(".mobile-menu__close")
    };
    els.closeBtn.addEventListener("click", close);
    overlayEl.querySelectorAll(".mobile-menu__nav-link, .btn").forEach(function (link) {
      link.addEventListener("click", close);
    });
  }

  return { render: render, init: init, open: open, close: close, toggle: toggle, isOpen: isOpen };
})(window.IQRAA);
