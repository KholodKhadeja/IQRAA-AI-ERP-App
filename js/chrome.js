/* Mounted on every page: shared header/footer/accessibility widget, then a
   first translatePage() pass. Runs after all component scripts have loaded
   (see the <script> order documented in CLAUDE.md §10). */
window.IQRAA = window.IQRAA || {};

document.addEventListener("DOMContentLoaded", function () {
  IQRAA.components.header.init();
  IQRAA.components.footer.init();
  IQRAA.components.accessibilityWidget.init();
  IQRAA.i18n.translatePage();
});
