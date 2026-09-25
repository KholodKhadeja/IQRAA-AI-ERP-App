/* Team Management (screens.md §20).

   2026-09-22 "Connect Team pages to Airtable": this list now renders
   real records from js/services/users-api.js's getTeamMembers() (GET
   /api/users/team on the existing backend, which reads the Airtable
   Users table) instead of js/data/mock-data.js's data.teamMembers. A
   fresh fetch runs every time this page loads — see loadTeamMembers()
   below — so editing a user's Role/Status/Phone directly in Airtable and
   reloading this page reflects the change, same pattern as
   js/pages/projects.js/leads.js. The backend already filters out
   Admin/Project Manager/Client records (and blank placeholder rows) —
   see backend/server.js's Team section — so every row here is a real
   internal team member, never a client.

   Active-project/active-task counts are still derived from
   js/data/mock-data.js's data.projects/data.tasks (same principle as PM
   Workload in Admin Overview — CLAUDE.md §10) — but since those are mock
   records keyed by fake "tm-N" ids unrelated to real Airtable record
   ids, they correctly show 0 for every real team member until a future
   task wires Projects/Tasks to real Users. Not fixed here per this
   task's explicit "don't build a new data architecture, keep it
   incremental" instruction.

   Create is unchanged (2026-09-21g): the "New Team Member" form still
   collects Full Name / Email / Role / Status / Phone / Password and
   submits them to the real Users backend (js/services/users-api.js ->
   backend/server.js -> Airtable). On success, the record the backend
   returns is merged into the local list so it shows up immediately
   without a full page reload. Remove isn't implemented here: a
   destructive action needs a confirmation flow this project has no
   precedent for yet, so it's left out rather than wired to a bare native
   confirm() with no design behind it.

   2026-09-25 "Team pause/reactivate" fix: the pause/reactivate toggle now
   persists to Airtable via js/services/users-api.js's updateUserStatus()
   (PATCH /api/users/:id/status on the existing backend, Admin-only, same
   as every other write on this page) instead of only updating the
   in-memory row — still the real Active/Inactive vocabulary the previous
   task already switched to. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    var usersApi = ns.services.usersApi;
    if (!data || !ph || !usersApi) return;

    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var PLACEHOLDER = "—";
    var STATUS_TONE = { active: "success", inactive: "neutral" };
    var ROLE_KEYS = ["teamRole.producer", "teamRole.designer", "teamRole.instructionalDesigner", "teamRole.qa", "teamRole.developer"];
    /* Airtable single-select values for the Status field — confirmed live
       2026-09-21g against the real Users table schema: "Active"/"Inactive". */
    var STATUS_VALUES = ["Active", "Inactive"];

    /* 2026-09-25 "Team tabs + KPIs redesign" — tabs group by role, using
       the same ROLE_KEYS this page's own "New Team Member" form already
       uses (member.role holds one of these i18n keys directly, per
       usersApi's mapping, so no separate lookup table is needed). */
    var activeTab = "all";

    var allTeamMembers = [];

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

    function renderLoading() {
      document.getElementById("team-list-body").innerHTML =
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
        ns.i18n.t("team.loading") +
        "</p>";
    }

    function renderError() {
      document.getElementById("team-list-body").innerHTML =
        '<div class="panel__empty">' +
        "<p>" + ns.i18n.t("team.loadError") + "</p>" +
        '<button type="button" class="btn btn--secondary" id="team-retry-btn">' + ns.i18n.t("team.retry") + "</button>" +
        "</div>";
      var retryBtn = document.getElementById("team-retry-btn");
      if (retryBtn) retryBtn.addEventListener("click", loadTeamMembers);
    }

    function openMemberDetails(member) {
      var statusLabel = ns.i18n.t("team.status" + (member.status === "active" ? "Active" : "Inactive"));
      var body =
        ph.fieldRow("team.roleLabel", ns.i18n.t(member.role)) +
        ph.fieldRow("projectFields.status", ph.badge(statusLabel, STATUS_TONE[member.status])) +
        ph.fieldRow("settings.emailLabel", member.email || PLACEHOLDER) +
        ph.fieldRow("leadFields.phone", member.phone || PLACEHOLDER);
      ns.components.modal.open(member.fullName || PLACEHOLDER, body);
    }

    function matchesFilters(member) {
      if (activeTab !== "all" && member.role !== activeTab) return false;
      return true;
    }

    /* KPI row + tabs (2026-09-25 "Team tabs + KPIs redesign") — both
       computed from the full fetched set, not the current tab, same
       convention as every other KPI row in the app. */
    function renderKpis() {
      var active = allTeamMembers.filter(function (m) {
        return m.status === "active";
      }).length;
      var items = [
        { icon: "users", accent: "purple", value: allTeamMembers.length, label: ns.i18n.t("team.kpiTotalLabel") },
        { icon: "check", accent: "green", value: active, label: ns.i18n.t("team.kpiActiveLabel") },
        { icon: "alertTriangle", accent: "rose", value: allTeamMembers.length - active, label: ns.i18n.t("team.kpiInactiveLabel") }
      ];
      document.getElementById("team-kpi-grid").innerHTML = items.map(ph.kpiCardHtml).join("");
    }

    function renderTabs() {
      var countByRole = {};
      allTeamMembers.forEach(function (m) {
        countByRole[m.role] = (countByRole[m.role] || 0) + 1;
      });
      var tabs = [{ key: "all", label: ns.i18n.t("team.tabAll"), count: allTeamMembers.length }].concat(
        ROLE_KEYS.filter(function (roleKey) {
          return countByRole[roleKey] > 0;
        }).map(function (roleKey) {
          return { key: roleKey, label: ns.i18n.t(roleKey), count: countByRole[roleKey] };
        })
      );
      var host = document.getElementById("team-tabs-root");
      host.innerHTML = ph.tabsHtml(tabs, activeTab, ns.i18n.t("team.roleLabel"));
      host.querySelectorAll("[data-tab-key]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          activeTab = btn.getAttribute("data-tab-key");
          renderTabs();
          renderTable();
        });
      });
    }

    function renderTable() {
      var host = document.getElementById("team-list-body");
      var visibleMembers = allTeamMembers.filter(matchesFilters);
      if (visibleMembers.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("team.emptyResults") + "</p>";
        return;
      }
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("team.fullNameLabel") + "</th>" +
        "<th>" + ns.i18n.t("team.roleLabel") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.status") + "</th>" +
        "<th>" + ns.i18n.t("clientFields.activeProjects") + "</th>" +
        "<th>" + ns.i18n.t("team.activeTasksLabel") + "</th>" +
        "<th></th>" +
        "</tr>";
      var rows = visibleMembers
        .map(function (member) {
          var statusLabel = ns.i18n.t("team.status" + (member.status === "active" ? "Active" : "Inactive"));
          var actionLabel = ns.i18n.t(member.status === "active" ? "team.pauseAction" : "team.reactivateAction");
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("team.fullNameLabel") + '"><button type="button" class="data-table__primary" data-member-open="' + member.id + '">' + (member.fullName || PLACEHOLDER) + "</button></td>" +
            '<td data-label="' + ns.i18n.t("team.roleLabel") + '">' + ns.i18n.t(member.role) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.status") + '">' + ph.badge(statusLabel, STATUS_TONE[member.status]) + "</td>" +
            '<td data-label="' + ns.i18n.t("clientFields.activeProjects") + '">' + activeProjectCount(member.id) + "</td>" +
            '<td data-label="' + ns.i18n.t("team.activeTasksLabel") + '">' + activeTaskCount(member.id) + "</td>" +
            '<td><button type="button" class="btn btn--secondary" data-toggle-status="' + member.id + '">' + actionLabel + "</button></td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";

      host.querySelectorAll("[data-member-open]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var member = allTeamMembers.filter(function (m) {
            return m.id === btn.getAttribute("data-member-open");
          })[0];
          if (member) openMemberDetails(member);
        });
      });

      host.querySelectorAll("[data-toggle-status]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var member = allTeamMembers.filter(function (m) {
            return m.id === btn.getAttribute("data-toggle-status");
          })[0];
          if (!member) return;
          var newStatus = member.status === "active" ? "inactive" : "active";
          var airtableStatus = newStatus === "active" ? "Active" : "Inactive";

          btn.disabled = true;
          usersApi
            .updateUserStatus(member.id, airtableStatus)
            .then(function () {
              member.status = newStatus;
              renderKpis();
              renderTable();
            })
            .catch(function (err) {
              console.error("[team] Failed to update status in Airtable:", err);
              btn.disabled = false;
              window.alert(ns.i18n.t("team.statusUpdateError"));
            });
        });
      });
    }

    function loadTeamMembers() {
      renderLoading();
      usersApi
        .getTeamMembers()
        .then(function (teamMembers) {
          allTeamMembers = teamMembers;
          renderKpis();
          renderTabs();
          renderTable();
        })
        .catch(function (err) {
          console.error("[team] Failed to load team members from the backend:", err);
          renderError();
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
            allTeamMembers.push({
              id: (created && created.id) || "tm-pending-" + Date.now(),
              fullName: nameInput.value.trim(),
              email: emailInput.value.trim(),
              role: roleSelect.value,
              status: statusSelect.value === "Active" ? "active" : "inactive",
              phone: phoneInput.value.trim() || null
            });
            ns.components.modal.close();
            renderKpis();
            renderTabs();
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

    loadTeamMembers();
  });
})(window.IQRAA);
