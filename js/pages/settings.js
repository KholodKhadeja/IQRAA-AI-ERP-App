/* Settings (screens.md §22), shared by every role — Profile + Preferences
   for everyone, a read-only System Settings reference section for Admin
   only (session.user.role === "admin", from ns.workspaceAuthReady — see
   js/workspace-chrome.js, 2026-09-21h). No password/secret field anywhere
   here (CLAUDE.md §5/§20). Preferences don't duplicate the floating
   accessibility widget's controls (CLAUDE.md §7) — just a link to the
   accessibility statement plus a short pointer to the widget.

   Profile identity comes straight from the real, session-derived
   session.user (2026-09-23 "Phase 3 data mapping fixes") — GET
   /api/auth/me's response only ever contains {id,email,fullName,role}
   (CLAUDE.md §5/§19c), so that's the entire identity available here; the
   previous mock ROLE_DEMO_NAME lookup (data.currentPmId/
   currentTeamMemberId/currentClientId) is gone. Phone has no real
   session field to source from, so it's left blank rather than filled
   from mock client/PM data that doesn't belong to the logged-in user. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  ns.workspaceAuthReady.then(function (session) {
    var data = ns.data;
    if (!data) return;

    function renderProfile() {
      var idp = "settings-profile";
      var host = document.getElementById("settings-profile-body");
      host.innerHTML =
        '<form id="' + idp + '-form">' +
        ns.components.textField.render({ id: idp + "-name", labelI18nKey: "leadFields.name" }) +
        ns.components.textField.render({ id: idp + "-email", labelI18nKey: "settings.emailLabel", type: "email" }) +
        ns.components.textField.render({ id: idp + "-phone", labelI18nKey: "leadFields.phone", type: "tel" }) +
        '<div class="modal__actions modal__actions--start">' +
        '<button type="submit" class="btn btn--primary">' + ns.i18n.t("leads.saveButton") + "</button>" +
        "</div>" +
        "</form>" +
        '<p class="note-text" id="settings-save-success" hidden>' + ns.i18n.t("settings.saveSuccess") + "</p>";

      document.getElementById(idp + "-name").value = session.user.fullName || "";
      document.getElementById(idp + "-email").value = session.user.email || "";

      document.getElementById(idp + "-form").addEventListener("submit", function (event) {
        event.preventDefault();
        document.getElementById("settings-save-success").hidden = false;
      });
    }

    function renderPreferences() {
      var host = document.getElementById("settings-preferences-body");
      host.innerHTML =
        '<label class="checkbox-row"><input type="checkbox" id="settings-notify-email" checked /><span>' +
        ns.i18n.t("settings.notifyEmailLabel") + "</span></label>" +
        '<label class="checkbox-row"><input type="checkbox" id="settings-notify-tasks" checked /><span>' +
        ns.i18n.t("settings.notifyTaskLabel") + "</span></label>" +
        '<p class="note-text">' + ns.i18n.t("settings.accessibilityNote") + " " +
        '<a href="accessibility.html">' + ns.i18n.t("a11yWidget.statementLink") + "</a></p>";
    }

    function renderSystem() {
      var section = document.getElementById("settings-system-section");
      if (session.user.role !== "admin") {
        section.hidden = true;
        return;
      }
      section.hidden = false;
      document.getElementById("settings-pipeline-reference").innerHTML = data.pipelineStages
        .map(function (stage, index) {
          return '<li>' + (index + 1) + ". " + ns.i18n.t(stage.labelKey) + "</li>";
        })
        .join("");
    }

    function renderAll() {
      renderProfile();
      renderPreferences();
      renderSystem();
    }

    renderAll();
  });
})(window.IQRAA);
