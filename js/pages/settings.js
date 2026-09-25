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
   currentTeamMemberId/currentClientId) is gone.

   2026-09-25 "Settings profile save" fix: the Profile form previously
   only ever showed a fake success message and never persisted anything
   (no fetch call at all). It now saves via ns.services.auth.updateProfile()
   (PATCH /api/users/me on the existing backend — see backend/README.md),
   which also extended session.user with a real `phone` field (read at
   login from the Users record, alongside fullName/email/role), so Phone
   is no longer left blank. Email stays read-only on this form — it's the
   login lookup key, and changing it is out of scope per this task's "do
   not change authentication" rule. */
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
        '<p class="note-text">' + ns.i18n.t("settings.emailReadonlyNote") + "</p>" +
        ns.components.textField.render({ id: idp + "-phone", labelI18nKey: "leadFields.phone", type: "tel" }) +
        '<div class="modal__actions modal__actions--start">' +
        '<button type="submit" class="btn btn--primary" id="' + idp + '-submit">' + ns.i18n.t("leads.saveButton") + "</button>" +
        "</div>" +
        "</form>" +
        '<p class="note-text" id="settings-save-success" hidden>' + ns.i18n.t("settings.saveSuccess") + "</p>" +
        '<p class="note-text" id="settings-save-error" role="alert" hidden></p>';

      document.getElementById(idp + "-name").value = session.user.fullName || "";
      var emailInput = document.getElementById(idp + "-email");
      emailInput.value = session.user.email || "";
      emailInput.setAttribute("readonly", "readonly");
      document.getElementById(idp + "-phone").value = session.user.phone || "";

      var submitBtn = document.getElementById(idp + "-submit");
      var successEl = document.getElementById("settings-save-success");
      var errorEl = document.getElementById("settings-save-error");

      document.getElementById(idp + "-form").addEventListener("submit", function (event) {
        event.preventDefault();
        successEl.hidden = true;
        errorEl.hidden = true;
        submitBtn.disabled = true;

        ns.services.auth
          .updateProfile({
            fullName: document.getElementById(idp + "-name").value.trim(),
            phone: document.getElementById(idp + "-phone").value.trim()
          })
          .then(function (updatedUser) {
            if (updatedUser) {
              session.user.fullName = updatedUser.fullName;
              session.user.phone = updatedUser.phone;
            }
            submitBtn.disabled = false;
            successEl.hidden = false;
          })
          .catch(function (err) {
            console.error("[settings] Failed to save profile to the backend:", err);
            submitBtn.disabled = false;
            errorEl.textContent = ns.i18n.t("settings.saveError");
            errorEl.hidden = false;
          });
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
