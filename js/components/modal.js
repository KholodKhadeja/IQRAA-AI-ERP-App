/* Generic Workspace modal — Task Detail (screens.md §12), Lead Details/
   Create/Edit (§7), Client Details (§8) and any future confirmation
   dialog all reuse this one implementation instead of each building their
   own overlay. Same open/close/Escape/click-outside shape as
   components/accessibility-widget.js's popover, but a true modal: traps
   focus by moving it to the close button on open and restoring the
   triggering element's focus on close. Only mounted on pages that include
   a #modal-root placeholder — init() no-ops otherwise, same guard style as
   every other component's init(). */
window.IQRAA = window.IQRAA || {};
IQRAA.components = IQRAA.components || {};

IQRAA.components.modal = (function (ns) {
  var isOpenState = false;
  var els = null;
  var lastFocused = null;

  function render() {
    return (
      '<div class="modal-overlay" id="modal-overlay" hidden>' +
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal__header">' +
      '<span id="modal-title-wrap"></span>' +
      '<button type="button" class="modal__close" data-i18n-attr="aria-label:modal.close">' + ns.icons.x(18) + "</button>" +
      "</div>" +
      '<div class="modal__body" id="modal-body"></div>' +
      "</div>" +
      "</div>"
    );
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") close();
  }

  function handleOverlayClick(event) {
    if (els && event.target === els.overlay) close();
  }

  function open(titleText, bodyHtml) {
    if (!els) return;
    lastFocused = document.activeElement;
    els.titleWrap.innerHTML = '<h2 class="modal__title" id="modal-title">' + titleText + "</h2>";
    els.dialog.setAttribute("aria-labelledby", "modal-title");
    els.body.innerHTML = bodyHtml;
    els.overlay.hidden = false;
    isOpenState = true;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    els.closeBtn.focus();
  }

  function close() {
    if (!els) return;
    isOpenState = false;
    els.overlay.hidden = true;
    els.titleWrap.innerHTML = "";
    els.dialog.removeAttribute("aria-labelledby");
    els.body.innerHTML = "";
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleKeyDown);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    lastFocused = null;
  }

  function isOpen() {
    return isOpenState;
  }

  function init() {
    var root = document.getElementById("modal-root");
    if (!root) return;
    root.innerHTML = render();
    els = {
      overlay: document.getElementById("modal-overlay"),
      dialog: root.querySelector(".modal"),
      titleWrap: document.getElementById("modal-title-wrap"),
      body: document.getElementById("modal-body"),
      closeBtn: root.querySelector(".modal__close")
    };
    els.closeBtn.addEventListener("click", close);
    els.overlay.addEventListener("click", handleOverlayClick);
  }

  return { init: init, open: open, close: close, isOpen: isOpen };
})(window.IQRAA);
