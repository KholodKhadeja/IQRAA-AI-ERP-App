/* Internal Workspace sidebar — role-aware navigation, right-side (RTL).
   Open/close/toggle follows the exact same overlay pattern as
   components/mobile-menu.js (fixed backdrop + Escape + click-outside),
   kept as its own implementation since the sidebar's markup/role logic is
   unrelated to the public-site mobile menu — see CLAUDE.md §9.
   An item with no `href` (still `enabled: false`) is a real, documented
   "coming soon" control (disabled button, not a dead link) — later build
   steps replace each one with a working page as it's built; the ones that
   already have an `href` (Overview/My Workspace, Leads, Projects/My
   Projects, Clients) are wired to real screens. When more than one item
   for a role can be `enabled` at once, "current page" is decided per item
   by comparing its href against the actual page filename, not by
   `enabled` alone — see renderItem() below. */
window.IQRAA = window.IQRAA || {};
IQRAA.components = IQRAA.components || {};

IQRAA.components.sidebar = (function (ns) {
  var PATHS = window.IQRAA_PATHS || { root: "", pages: "" };

  var NAV_ITEMS = {
    admin: [
      { key: "overview", href: "dashboard-admin.html", icon: "layoutDashboard", enabled: true },
      { key: "leads", href: "leads.html", icon: "users", enabled: true },
      { key: "projects", href: "projects.html", icon: "folder", enabled: true },
      { key: "team", href: "team.html", icon: "users", enabled: true },
      { key: "clients", href: "clients.html", icon: "briefcase", enabled: true },
      { key: "billing", href: "billing.html", icon: "creditCard", enabled: true },
      { key: "settings", href: "settings.html", icon: "settings", enabled: true }
    ],
    pm: [
      { key: "overview", href: "dashboard-pm.html", icon: "layoutDashboard", enabled: true },
      { key: "myProjects", href: "projects.html", icon: "folder", enabled: true },
      { key: "tasks", icon: "listChecks", enabled: false },
      { key: "clients", icon: "briefcase", enabled: false },
      { key: "settings", href: "settings.html", icon: "settings", enabled: true }
    ],
    teamMember: [
      { key: "myWorkspace", href: "dashboard-team.html", icon: "home", enabled: true },
      { key: "myTasks", href: "my-tasks.html", icon: "listChecks", enabled: true },
      { key: "myProjects", href: "projects.html", icon: "folder", enabled: true },
      { key: "profile", href: "settings.html", icon: "user", enabled: true }
    ],
    client: [
      { key: "myWorkspace", href: "dashboard-client.html", icon: "home", enabled: true },
      { key: "projects", href: "client-project.html", icon: "folder", enabled: true },
      { key: "contact", icon: "phone", enabled: false },
      { key: "profile", href: "settings.html", icon: "user", enabled: true }
    ]
  };

  function renderItem(item) {
    var icon = ns.icons[item.icon](18);
    var label = '<span data-i18n="sidebar.' + item.key + '"></span>';
    if (item.enabled) {
      var currentFile = (window.location.pathname.split("/").pop() || "").toLowerCase();
      var isCurrent = currentFile === item.href.toLowerCase();
      return (
        '<li><a href="' + PATHS.pages + item.href + '" class="sidebar__nav-link' +
        (isCurrent ? " sidebar__nav-link--current" : "") + '"' +
        (isCurrent ? ' aria-current="page"' : "") + ">" +
        icon + label + "</a></li>"
      );
    }
    return (
      '<li><button type="button" class="sidebar__nav-link sidebar__nav-link--disabled" disabled aria-disabled="true">' +
      icon + label +
      '<span class="sidebar__soon-badge" data-i18n="sidebar.comingSoon"></span>' +
      "</button></li>"
    );
  }

  function render(role) {
    var items = NAV_ITEMS[role] || NAV_ITEMS.admin;
    var links = items.map(renderItem).join("");
    return (
      '<div class="sidebar-overlay" id="sidebar-overlay">' +
      '<aside class="sidebar">' +
      '<div class="sidebar__header">' +
      '<span class="sidebar__brand-names">' +
      '<span class="sidebar__brand-company">IQRAA Digital Learning</span>' +
      '<span class="sidebar__brand-product">AI Learning Operations ERP</span>' +
      "</span>" +
      '<button type="button" class="sidebar__close" data-i18n-attr="aria-label:sidebar.closeMenu">' + ns.icons.x(20) + "</button>" +
      "</div>" +
      '<nav data-i18n-attr="aria-label:sidebar.navAriaLabel">' +
      '<ul class="sidebar__nav-list">' + links + "</ul>" +
      "</nav>" +
      "</aside>" +
      "</div>"
    );
  }

  var isOpenState = false;
  var els = null;

  function handleKeyDown(event) {
    if (event.key === "Escape") close();
  }

  function handleOverlayClick(event) {
    if (els && event.target === els.overlay) close();
  }

  function open() {
    if (!els) return;
    isOpenState = true;
    els.overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
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
    if (!overlayEl) return;
    els = { overlay: overlayEl, closeBtn: overlayEl.querySelector(".sidebar__close") };
    els.closeBtn.addEventListener("click", close);
    overlayEl.addEventListener("click", handleOverlayClick);
    overlayEl.querySelectorAll(".sidebar__nav-link").forEach(function (link) {
      link.addEventListener("click", close);
    });
  }

  return { render: render, init: init, open: open, close: close, toggle: toggle, isOpen: isOpen };
})(window.IQRAA);
