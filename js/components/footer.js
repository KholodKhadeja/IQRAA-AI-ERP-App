/* Plain-JS port of components/layout/Footer.tsx. */
window.IQRAA = window.IQRAA || {};
IQRAA.components = IQRAA.components || {};

IQRAA.components.footer = (function () {
  var PATHS = window.IQRAA_PATHS || { root: "", pages: "" };

  function render() {
    var year = new Date().getFullYear();
    return (
      '<footer class="footer">' +
      '<div class="container footer__inner">' +
      '<div class="footer__brand-block">' +
      '<span class="footer__brand">IQRAA Digital Learning</span>' +
      '<p class="footer__description" data-i18n="footer.description"></p>' +
      "</div>" +
      '<div class="footer__columns">' +
      '<nav data-i18n-attr="aria-label:footer.navTitle">' +
      '<h2 class="footer__column-title" data-i18n="footer.navTitle"></h2>' +
      '<ul class="footer__link-list">' +
      '<li><a href="' + PATHS.root + 'index.html#services" data-i18n="footer.services"></a></li>' +
      '<li><a href="' + PATHS.root + 'index.html#process" data-i18n="footer.process"></a></li>' +
      "</ul></nav>" +
      '<nav data-i18n-attr="aria-label:footer.contactTitle">' +
      '<h2 class="footer__column-title" data-i18n="footer.contactTitle"></h2>' +
      '<ul class="footer__link-list">' +
      '<li><a href="' + PATHS.root + 'index.html#contact" data-i18n="footer.talkToUs"></a></li>' +
      '<li><a href="' + PATHS.pages + 'accessibility.html" data-i18n="footer.accessibility"></a></li>' +
      '<li><a href="' + PATHS.root + 'index.html#contact" data-i18n="footer.privacy"></a></li>' +
      "</ul></nav>" +
      "</div></div>" +
      '<div class="container"><div class="footer__bottom">' +
      '<span>© ' + year + ' IQRAA Digital Learning LTD. <span data-i18n="footer.rights"></span></span>' +
      '<span data-i18n="footer.poweredBy"></span>' +
      "</div></div>" +
      "</footer>"
    );
  }

  function init() {
    var root = document.getElementById("footer-root");
    if (!root) return;
    root.innerHTML = render();
  }

  return { render: render, init: init };
})(window.IQRAA);
