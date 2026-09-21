/* Internal Workspace top header: page title, notification bell (popover
   shell only — real Notification Center content is a later screen, see
   CLAUDE.md §9) and a user menu (name/role + sign out). The bell and
   user-menu popovers share the same open/close/click-outside/Escape
   wiring, one generic wirePopover() instead of two near-duplicate
   implementations. There is no language selector — the app is Hebrew-only
   (see CLAUDE.md §12). */
window.IQRAA = window.IQRAA || {};
IQRAA.components = IQRAA.components || {};

IQRAA.components.workspaceHeader = (function (ns) {
  var ROLE_LABEL_KEYS = {
    admin: "workspace.roleLabel.admin",
    pm: "workspace.roleLabel.pm",
    teamMember: "workspace.roleLabel.teamMember",
    client: "workspace.roleLabel.client"
  };

  function render(titleKey, user, role, titleText) {
    var name = (user && user.name) || "";
    var initial = (name.charAt(0) || "U").toUpperCase();
    var roleKey = ROLE_LABEL_KEYS[role] || ROLE_LABEL_KEYS.admin;
    var titleHtml = titleText
      ? '<h1 class="workspace-header__title">' + titleText + "</h1>"
      : '<h1 class="workspace-header__title" data-i18n="' + titleKey + '"></h1>';

    return (
      '<div class="workspace-header__inner">' +
      '<button type="button" class="workspace-header__menu-btn" id="workspace-menu-btn" aria-expanded="false" aria-controls="sidebar-overlay"></button>' +
      titleHtml +
      '<div class="workspace-header__actions">' +

      '<div class="workspace-popover" id="workspace-notif">' +
      '<button type="button" class="workspace-header__icon-btn" aria-haspopup="dialog" aria-expanded="false" data-i18n-attr="aria-label:workspace.notificationsLabel">' +
      ns.icons.bell(20) +
      "</button>" +
      '<div class="workspace-popover__panel" role="dialog" aria-modal="false" hidden>' +
      '<p class="workspace-popover__empty" data-i18n="workspace.notificationsEmpty"></p>' +
      "</div>" +
      "</div>" +

      '<div class="workspace-popover" id="workspace-user">' +
      '<button type="button" class="workspace-user__trigger" aria-haspopup="dialog" aria-expanded="false">' +
      '<span class="workspace-user__avatar" aria-hidden="true">' + initial + "</span>" +
      '<span class="workspace-user__name">' + name + "</span>" +
      ns.icons.chevronDown(14) +
      "</button>" +
      '<div class="workspace-popover__panel workspace-user__panel" role="dialog" aria-modal="false" hidden>' +
      '<div class="workspace-user__info">' +
      '<span class="workspace-user__info-name">' + name + "</span>" +
      '<span class="workspace-user__info-role" data-i18n="' + roleKey + '"></span>' +
      "</div>" +
      '<button type="button" class="workspace-user__signout" id="workspace-signout-btn">' +
      ns.icons.logOut(16) + '<span data-i18n="workspace.signOut"></span>' +
      "</button>" +
      "</div>" +
      "</div>" +

      "</div>" +
      "</div>"
    );
  }

  function wirePopover(wrapper) {
    var trigger = wrapper.querySelector("button[aria-haspopup]");
    var panel = wrapper.querySelector(".workspace-popover__panel");
    if (!trigger || !panel) return;

    function open() {
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    function close() {
      panel.hidden = true;
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
      if (panel.hidden) open();
      else close();
    });
  }

  function init(root) {
    root.querySelectorAll(".workspace-popover").forEach(wirePopover);
  }

  return { render: render, init: init };
})(window.IQRAA);
