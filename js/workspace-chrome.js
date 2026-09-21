/* Mounted on every internal Workspace page: sidebar + workspace header +
   the accessibility widget, then a translatePage() pass. Internal analog
   of js/chrome.js (public-site chrome) — kept separate since the two
   mount completely different component sets (see CLAUDE.md §9/§18).

   2026-09-21h "Login authentication flow": this file now enforces real
   session-backed access control instead of faking a role. There is no
   more sessionStorage-role-persistence mechanism and no more
   demo-user-label fallback — a real session (or a redirect to Login) is
   authoritative.

   window.IQRAA_ROLE is still a per-page constant set the same way it
   always was (see e.g. pages/dashboard-admin.html), but its MEANING is
   now "the role required to view this page" rather than "the role to
   fake." Pages reachable by more than one role (projects.html,
   project-workspace.html, settings.html) simply don't set it, same as
   before — this file treats an unset IQRAA_ROLE as "any authenticated
   role may view this page." The role actually used to render the
   sidebar/header and to gate content always comes from the real session
   (session.user.role), never from IQRAA_ROLE.

   Because getSession() is now a real network call (GET /api/auth/me),
   role resolution is async. To avoid a flash of protected content before
   an unauthenticated/wrong-role redirect completes, the ".workspace-shell"
   element is hidden (visibility:hidden) synchronously the instant this
   script runs — it's already in the DOM at that point since this script
   tag sits at the bottom of <body> — and only revealed once the session
   check has actually passed.

   ns.workspaceAuthReady is a Promise, assigned here at top-level script
   scope (before DOMContentLoaded fires) so it exists in time for other
   page scripts to consume it. It resolves with the verified session once
   this page is confirmed accessible, and never resolves at all if this
   page is redirecting away (the navigation makes further work moot) —
   js/pages/projects.js, project-workspace.js and settings.js are the 3
   scripts that actually need the resolved role for correctness and
   consume this via ns.workspaceAuthReady.then(...) instead of a bare
   DOMContentLoaded listener. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  var PATHS = window.IQRAA_PATHS || { root: "", pages: "" };
  var LOGIN_URL = PATHS.pages + "login.html";

  var ROLE_TO_DASHBOARD = {
    admin: "dashboard-admin.html",
    pm: "dashboard-pm.html",
    teamMember: "dashboard-team.html",
    client: "dashboard-client.html"
  };

  var shell = document.querySelector(".workspace-shell");
  if (shell) shell.style.visibility = "hidden";

  function redirectTo(url) {
    window.location.href = url;
    /* A promise that never resolves — the page is navigating away, so
       any .then() chained onto ns.workspaceAuthReady simply never runs
       rather than briefly executing against an invalid/unauthorized
       session. */
    return new Promise(function () {});
  }

  ns.workspaceAuthReady = ns.services.auth.getSession().then(function (session) {
    if (!session || !session.user) return redirectTo(LOGIN_URL);

    var requiredRole = window.IQRAA_ROLE;
    if (requiredRole && session.user.role !== requiredRole) {
      return redirectTo(ROLE_TO_DASHBOARD[session.user.role] || LOGIN_URL);
    }

    return session;
  });

  document.addEventListener("DOMContentLoaded", function () {
    ns.workspaceAuthReady.then(function (session) {
      var role = session.user.role;
      var user = { name: session.user.fullName || session.user.email };
      window.IQRAA_RESOLVED_ROLE = role;

      var sidebarRoot = document.getElementById("sidebar-root");
      if (sidebarRoot) {
        sidebarRoot.innerHTML = ns.components.sidebar.render(role);
        ns.components.sidebar.init(document.getElementById("sidebar-overlay"));
      }

      var headerRoot = document.getElementById("workspace-header-root");
      if (headerRoot) {
        var titleKey = window.IQRAA_PAGE_TITLE_KEY || "sidebar.overview";
        var titleText = window.IQRAA_PAGE_TITLE_TEXT || "";
        headerRoot.innerHTML = ns.components.workspaceHeader.render(titleKey, user, role, titleText);
        ns.components.workspaceHeader.init(headerRoot);

        var menuBtn = document.getElementById("workspace-menu-btn");
        if (menuBtn && sidebarRoot) {
          var syncMenuBtn = function (isOpen) {
            menuBtn.innerHTML = isOpen ? ns.icons.x(22) : ns.icons.menu(22);
            menuBtn.setAttribute("aria-expanded", String(isOpen));
            menuBtn.setAttribute("aria-label", ns.i18n.t(isOpen ? "sidebar.closeMenu" : "sidebar.openMenu"));
          };
          menuBtn.addEventListener("click", function () {
            syncMenuBtn(ns.components.sidebar.toggle());
          });
          syncMenuBtn(false);
        }
      }

      var signOutBtn = document.getElementById("workspace-signout-btn");
      if (signOutBtn) {
        signOutBtn.addEventListener("click", function () {
          ns.services.auth.logout().then(function () {
            window.location.href = LOGIN_URL;
          });
        });
      }

      ns.components.accessibilityWidget.init();
      if (ns.components.modal) ns.components.modal.init();
      ns.i18n.translatePage();

      if (shell) shell.style.visibility = "";
    });
  });
})(window.IQRAA);
