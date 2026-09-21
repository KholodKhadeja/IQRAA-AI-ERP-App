/* Team Management (screens.md §20). Active-project/active-task counts are
   derived from data.projects/data.tasks at render time (same principle as
   PM Workload in Admin Overview — CLAUDE.md §10), never typed in. Pause/
   reactivate mutates data.teamMembers in place and re-renders, the same
   real-in-memory-mutation pattern as "assign PM" and "quick status
   update" elsewhere — that stays true for the LOCAL table view.

   Create is different (2026-09-21g): the "New Team Member" form now
   collects Full Name / Email / Role / Status / Phone / Password and
   submits them to the real Users backend (js/services/users-api.js ->
   backend/server.js -> Airtable), not just a local push into
   data.teamMembers. User ID / Created At / Last Login / Password Hash are
   Airtable-managed fields and deliberately do NOT appear in this form —
   the backend hashes the password and Airtable auto-populates the rest.
   On success, the record the backend returns is merged into the local
   list so it shows up immediately without a full page reload. Remove
   isn't implemented here: a destructive action needs a confirmation flow
   this project has no precedent for yet, so it's left out rather than
   wired to a bare native confirm() with no design behind it. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    var usersApi = ns.services.usersApi;
    if (!data || !ph) return;

    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var STATUS_TONE = { active: "success", paused: "neutral" };
    var ROLE_KEYS = ["teamRole.producer", "teamRole.designer", "teamRole.instructionalDesigner", "teamRole.qa", "teamRole.developer"];
    /* Airtable single-select values for the Status field — confirmed live
       2026-09-21g against the real Users table schema. Note this is
       "Active"/"Inactive", NOT "Active"/"Paused" — the existing local
       pause/reactivate toggle on the table below uses "paused" as its own
       separate, Airtable-unconnected UI concept (see renderTable() /
       STATUS_TONE above) and is deliberately left as-is; only the create
       form below needs to match Airtable's real option values exactly. */
    var STATUS_VALUES = ["Active", "Inactive"];
    var nextId = data.teamMembers.length + 1;

    function activeProjectCount(memberId) {
      return ph.projectsForTeamMember(memberId).filter(function (p) {
        return p.status !== "readyToStart";
      }).length;
    }

    function activeTaskCount(memberId) {
      return data.tasks.filter(function (t) {
        return t.assigneeId === memberId && t.status !== "completed";
      }).length;
    }

    function renderTable() {
      var host = document.getElementById("team-list-body");
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("team.fullNameLabel") + "</th>" +
        "<th>" + ns.i18n.t("team.roleLabel") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.status") + "</th>" +
        "<th>" + ns.i18n.t("clientFields.activeProjects") + "</th>" +
        "<th>" + ns.i18n.t("team.activeTasksLabel") + "</th>" +
        "<th></th>" +
        "</tr>";
      var rows = data.teamMembers
        .map(function (member) {
          var statusLabel = ns.i18n.t("team.status" + (member.status === "active" ? "Active" : "Paused"));
          var actionLabel = ns.i18n.t(member.status === "active" ? "team.pauseAction" : "team.reactivateAction");
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("team.fullNameLabel") + '">' + member.name + "</td>" +
            '<td data-label="' + ns.i18n.t("team.roleLabel") + '">' + ns.i18n.t(member.roleKey) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.status") + '">' + ph.badge(statusLabel, STATUS_TONE[member.status]) + "</td>" +
            '<td data-label="' + ns.i18n.t("clientFields.activeProjects") + '">' + activeProjectCount(member.id) + "</td>" +
            '<td data-label="' + ns.i18n.t("team.activeTasksLabel") + '">' + activeTaskCount(member.id) + "</td>" +
            '<td><button type="button" class="btn btn--secondary" data-toggle-status="' + member.id + '">' + actionLabel + "</button></td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";

      host.querySelectorAll("[data-toggle-status]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var member = data.teamMembers.filter(function (m) {
            return m.id === btn.getAttribute("data-toggle-status");
          })[0];
          if (!member) return;
          member.status = member.status === "active" ? "paused" : "active";
          renderTable();
        });
      });
    }

    function openCreateForm() {
      var idp = "team-form";
      var roleOptions = ROLE_KEYS.map(function (key) {
        return '<option value="' + key + '">' + ns.i18n.t(key) + "</option>";
      }).join("");
      var statusOptions = STATUS_VALUES.map(function (value) {
        return '<option value="' + value + '">' + ns.i18n.t("team.status" + value) + "</option>";
      }).join("");

      var body =
        '<form id="' + idp + '" novalidate>' +
        ns.components.textField.render({ id: idp + "-name", labelI18nKey: "team.fullNameLabel", required: true }) +
        ns.components.textField.render({ id: idp + "-email", labelI18nKey: "settings.emailLabel", required: true, type: "email", autoComplete: "email" }) +
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-role">' + ns.i18n.t("team.roleLabel") + "</label>" +
        '<select id="' + idp + '-role" class="select">' + roleOptions + "</select></div>" +
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-status">' + ns.i18n.t("team.statusLabel") + "</label>" +
        '<select id="' + idp + '-status" class="select">' + statusOptions + "</select></div>" +
        ns.components.textField.render({ id: idp + "-phone", labelI18nKey: "leadFields.phone", type: "tel" }) +
        ns.components.textField.render({ id: idp + "-password", labelI18nKey: "login.passwordLabel", required: true, isPassword: true, autoComplete: "new-password" }) +
        '<div class="modal__actions">' +
        '<button type="button" class="btn btn--secondary" id="' + idp + '-cancel">' + ns.i18n.t("leads.cancelButton") + "</button>" +
        '<button type="submit" class="btn btn--primary" id="' + idp + '-submit">' + ns.i18n.t("leads.saveButton") + "</button>" +
        "</div>" +
        '<p class="note-text" id="' + idp + '-error" role="alert" hidden></p>' +
        "</form>";
      ns.components.modal.open(ns.i18n.t("team.createTitle"), body);

      var nameInput = document.getElementById(idp + "-name");
      var emailInput = document.getElementById(idp + "-email");
      var roleSelect = document.getElementById(idp + "-role");
      var statusSelect = document.getElementById(idp + "-status");
      var phoneInput = document.getElementById(idp + "-phone");
      var passwordInput = document.getElementById(idp + "-password");
      var submitBtn = document.getElementById(idp + "-submit");
      var errorEl = document.getElementById(idp + "-error");
      var form = document.getElementById(idp);
      var touched = {};

      ns.components.textField.wirePasswordToggle(idp + "-password", "login.showPassword", "login.hidePassword");

      function validateField(input, key, requiredKey, invalidKey) {
        if (!touched[key]) return true;
        var value = input.value.trim();
        var error = "";
        if (value.length === 0) error = ns.i18n.t(requiredKey);
        else if (invalidKey && !EMAIL_PATTERN.test(value)) error = ns.i18n.t(invalidKey);
        ns.components.textField.setError(input.id, error);
        return !error;
      }

      [
        [nameInput, "name", "contact.nameRequired"],
        [passwordInput, "password", "team.passwordRequired"]
      ].forEach(function (entry) {
        entry[0].addEventListener("blur", function () {
          touched[entry[1]] = true;
          validateField(entry[0], entry[1], entry[2]);
        });
        entry[0].addEventListener("input", function () {
          if (touched[entry[1]]) validateField(entry[0], entry[1], entry[2]);
        });
      });
      emailInput.addEventListener("blur", function () {
        touched.email = true;
        validateField(emailInput, "email", "contact.emailRequired", "contact.emailInvalid");
      });
      emailInput.addEventListener("input", function () {
        if (touched.email) validateField(emailInput, "email", "contact.emailRequired", "contact.emailInvalid");
      });

      document.getElementById(idp + "-cancel").addEventListener("click", function () {
        ns.components.modal.close();
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        touched = { name: true, email: true, password: true };
        var validName = validateField(nameInput, "name", "contact.nameRequired");
        var validEmail = validateField(emailInput, "email", "contact.emailRequired", "contact.emailInvalid");
        var validPassword = passwordInput.value.length > 0;
        ns.components.textField.setError(passwordInput.id, validPassword ? "" : ns.i18n.t("team.passwordRequired"));
        if (!validName || !validEmail || !validPassword) return;

        errorEl.hidden = true;
        submitBtn.disabled = true;

        usersApi
          .createUser({
            fullName: nameInput.value.trim(),
            email: emailInput.value.trim(),
            role: roleSelect.value,
            status: statusSelect.value,
            phone: phoneInput.value.trim(),
            password: passwordInput.value
          })
          .then(function (created) {
            data.teamMembers.push({
              id: (created && created.id) || "tm-" + nextId++,
              name: nameInput.value.trim(),
              roleKey: roleSelect.value,
              status: statusSelect.value === "Active" ? "active" : "paused"
            });
            ns.components.modal.close();
            renderTable();
          })
          .catch(function (error) {
            submitBtn.disabled = false;
            var message = error && error.status ? ns.i18n.t("team.createError") : ns.i18n.t("team.backendUnreachable");
            errorEl.textContent = message + (error && error.message ? " (" + error.message + ")" : "");
            errorEl.hidden = false;
          });
      });
    }

    document.getElementById("team-create-btn").addEventListener("click", openCreateForm);

    renderTable();
  });
})(window.IQRAA);
