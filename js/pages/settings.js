/* Settings (screens.md §22), shared by every role — Profile + Preferences
   for everyone, a read-only System Settings reference section for Admin
   only (session.user.role === "admin", from ns.workspaceAuthReady — see
   js/workspace-chrome.js, 2026-09-21h). No password/secret field anywhere
   here (CLAUDE.md §5/§20). Preferences don't duplicate the floating
   accessibility widget's controls (CLAUDE.md §7) — just a link to the
   accessibility statement plus a short pointer to the widget. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  ns.workspaceAuthReady.then(function (session) {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    if (!data || !ph) return;

    var ROLE_DEMO_NAME = {
      admin: ns.i18n.t("workspace.roleLabel.admin"),
      pm: ph.pmName(data.currentPmId),
      teamMember: ph.teamMemberName(data.currentTeamMemberId),
      client: ph.getClient(data.currentClientId) ? ph.getClient(data.currentClientId).contactName : ""
    };

    function renderProfile() {
      var role = session.user.role || "admin";
      var name = ROLE_DEMO_NAME[role] || ns.i18n.t("workspace.demoUserLabel");
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

      document.getElementById(idp + "-name").value = name;
      if (role === "pm") document.getElementById(idp + "-email").value = ph.pmEmail(data.currentPmId);
      if (role === "client") {
        var client = ph.getClient(data.currentClientId);
        if (client) {
          document.getElementById(idp + "-email").value = client.contactEmail;
          document.getElementById(idp + "-phone").value = client.contactPhone;
        }
      }
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
