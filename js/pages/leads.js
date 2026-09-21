/* Leads List + Details + Create/Edit (screens.md §7). Details and
   Create/Edit are both the one shared modal component (js/components/
   modal.js) rather than dedicated pages/drawers — screens.md §34 is
   explicit that not every item needs an independent URL. The create/edit
   form reuses components/text-field.js and the existing touched-then-live
   validation pattern from js/pages/login.js, including its exact
   validation-message keys (contact.nameRequired etc. — the same rule
   applies to a lead's name as to the landing page's contact form). */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    if (!data || !ph) return;

    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var STATUS_KEYS = ["new", "qualified", "proposalSent", "won", "lost"];
    var STATUS_TONE = { new: "info", qualified: "warning", proposalSent: "warning", won: "success", lost: "neutral" };
    var SERVICE_KEYS = [
      "products.items.onlineCourse",
      "products.items.inPersonCourse",
      "products.items.hybridCourse",
      "products.items.games",
      "products.items.trainingVideos",
      "products.items.simulations",
      "products.items.presentations",
      "products.items.eLearning"
    ];

    var searchInput = document.getElementById("leads-search");
    var statusSelect = document.getElementById("leads-filter-status");
    var createBtn = document.getElementById("leads-create-btn");
    var nextId = data.leads.length + 1;

    function populateFilters() {
      var previous = statusSelect.value;
      statusSelect.innerHTML =
        '<option value="">' + ns.i18n.t("leads.allStatuses") + "</option>" +
        STATUS_KEYS.map(function (status) {
          return '<option value="' + status + '">' + ns.i18n.t("leadStatus." + status) + "</option>";
        }).join("");
      statusSelect.value = previous;
    }

    function matchesFilters(lead) {
      var query = searchInput.value.trim().toLowerCase();
      if (query && lead.name.toLowerCase().indexOf(query) === -1 && lead.org.toLowerCase().indexOf(query) === -1) {
        return false;
      }
      if (statusSelect.value !== "" && lead.statusKey !== statusSelect.value) {
        return false;
      }
      return true;
    }

    function renderTable() {
      var host = document.getElementById("leads-list-body");
      var leads = data.leads.filter(matchesFilters);
      if (leads.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("leads.emptyResults") + "</p>";
        return;
      }
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("leadFields.name") + "</th>" +
        "<th>" + ns.i18n.t("leadFields.org") + "</th>" +
        "<th>" + ns.i18n.t("leadFields.service") + "</th>" +
        "<th>" + ns.i18n.t("leadFields.status") + "</th>" +
        "<th>" + ns.i18n.t("leadFields.assignedTo") + "</th>" +
        "<th>" + ns.i18n.t("leadFields.lastActivity") + "</th>" +
        "</tr>";
      var rows = leads
        .map(function (lead) {
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("leadFields.name") + '"><button type="button" class="data-table__primary" data-lead-open="' + lead.id + '">' + lead.name + "</button></td>" +
            '<td data-label="' + ns.i18n.t("leadFields.org") + '">' + lead.org + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.service") + '">' + ns.i18n.t(lead.serviceKey) + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.status") + '">' + ph.badge(ns.i18n.t("leadStatus." + lead.statusKey), STATUS_TONE[lead.statusKey] || "neutral") + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.assignedTo") + '">' + lead.assignedTo + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.lastActivity") + '">' + ph.formatDate(lead.lastActivityDate) + "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";

      host.querySelectorAll("[data-lead-open]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var lead = data.leads.filter(function (l) {
            return l.id === btn.getAttribute("data-lead-open");
          })[0];
          if (lead) openLeadDetails(lead);
        });
      });
    }

    function fieldRow(labelKey, valueText) {
      return (
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t(labelKey) + "</span>" +
        '<span class="field-row__value">' + valueText + "</span>" +
        "</div>"
      );
    }

    function openLeadDetails(lead) {
      var body =
        fieldRow("leadFields.org", lead.org) +
        fieldRow("leadFields.email", lead.email) +
        fieldRow("leadFields.phone", lead.phone) +
        fieldRow("leadFields.service", ns.i18n.t(lead.serviceKey)) +
        fieldRow("leadFields.status", ph.badge(ns.i18n.t("leadStatus." + lead.statusKey), STATUS_TONE[lead.statusKey] || "neutral")) +
        fieldRow("leadFields.source", ns.i18n.t(lead.sourceKey)) +
        fieldRow("leadFields.assignedTo", lead.assignedTo) +
        fieldRow("leadFields.created", ph.formatDate(lead.createdDate)) +
        '<div class="modal__actions">' +
        '<button type="button" class="btn btn--primary" id="lead-details-edit">' + ns.i18n.t("leads.editButton") + "</button>" +
        "</div>";
      ns.components.modal.open(lead.name, body);
      document.getElementById("lead-details-edit").addEventListener("click", function () {
        openLeadForm(lead);
      });
    }

    function openLeadForm(existingLead) {
      var idp = "lead-form";
      var serviceOptions = SERVICE_KEYS.map(function (key) {
        return '<option value="' + key + '">' + ns.i18n.t(key) + "</option>";
      }).join("");
      var statusOptions = STATUS_KEYS.map(function (status) {
        return '<option value="' + status + '">' + ns.i18n.t("leadStatus." + status) + "</option>";
      }).join("");

      var body =
        '<form id="' + idp + '" novalidate>' +
        ns.components.textField.render({ id: idp + "-name", labelI18nKey: "leadFields.name", required: true }) +
        ns.components.textField.render({ id: idp + "-org", labelI18nKey: "leadFields.org", required: true }) +
        ns.components.textField.render({ id: idp + "-email", labelI18nKey: "leadFields.email", required: true, type: "email", autoComplete: "email" }) +
        ns.components.textField.render({ id: idp + "-phone", labelI18nKey: "leadFields.phone", required: true, type: "tel" }) +
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-service">' + ns.i18n.t("leadFields.service") + "</label>" +
        '<select id="' + idp + '-service" class="select">' + serviceOptions + "</select></div>" +
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-status">' + ns.i18n.t("leadFields.status") + "</label>" +
        '<select id="' + idp + '-status" class="select">' + statusOptions + "</select></div>" +
        '<div class="modal__actions">' +
        '<button type="button" class="btn btn--secondary" id="' + idp + '-cancel">' + ns.i18n.t("leads.cancelButton") + "</button>" +
        '<button type="submit" class="btn btn--primary">' + ns.i18n.t("leads.saveButton") + "</button>" +
        "</div>" +
        "</form>";

      ns.components.modal.open(ns.i18n.t(existingLead ? "leads.editTitle" : "leads.createTitle"), body);

      var nameInput = document.getElementById(idp + "-name");
      var orgInput = document.getElementById(idp + "-org");
      var emailInput = document.getElementById(idp + "-email");
      var phoneInput = document.getElementById(idp + "-phone");
      var serviceSelect = document.getElementById(idp + "-service");
      var statusSelectEl = document.getElementById(idp + "-status");
      var form = document.getElementById(idp);
      var touched = {};

      if (existingLead) {
        nameInput.value = existingLead.name;
        orgInput.value = existingLead.org;
        emailInput.value = existingLead.email;
        phoneInput.value = existingLead.phone;
        serviceSelect.value = existingLead.serviceKey;
        statusSelectEl.value = existingLead.statusKey;
      }

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
        [orgInput, "org", "contact.orgRequired"],
        [phoneInput, "phone", "contact.phoneRequired"]
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
        if (existingLead) openLeadDetails(existingLead);
        else ns.components.modal.close();
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        touched = { name: true, org: true, email: true, phone: true };
        var validName = validateField(nameInput, "name", "contact.nameRequired");
        var validOrg = validateField(orgInput, "org", "contact.orgRequired");
        var validEmail = validateField(emailInput, "email", "contact.emailRequired", "contact.emailInvalid");
        var validPhone = validateField(phoneInput, "phone", "contact.phoneRequired");
        if (!validName || !validOrg || !validEmail || !validPhone) return;

        if (existingLead) {
          existingLead.name = nameInput.value.trim();
          existingLead.org = orgInput.value.trim();
          existingLead.email = emailInput.value.trim();
          existingLead.phone = phoneInput.value.trim();
          existingLead.serviceKey = serviceSelect.value;
          existingLead.statusKey = statusSelectEl.value;
          existingLead.lastActivityDate = new Date().toISOString().slice(0, 10);
        } else {
          data.leads.unshift({
            id: "lead-" + nextId++,
            name: nameInput.value.trim(),
            org: orgInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            serviceKey: serviceSelect.value,
            statusKey: statusSelectEl.value,
            assignedTo: ns.i18n.t("workspace.demoUserLabel"),
            sourceKey: "leadSource.website",
            createdDate: new Date().toISOString().slice(0, 10),
            lastActivityDate: new Date().toISOString().slice(0, 10)
          });
        }
        ns.components.modal.close();
        renderTable();
      });
    }

    function renderAll() {
      populateFilters();
      renderTable();
    }

    searchInput.addEventListener("input", renderTable);
    statusSelect.addEventListener("change", renderTable);
    createBtn.addEventListener("click", function () {
      openLeadForm(null);
    });

    renderAll();
  });
})(window.IQRAA);
