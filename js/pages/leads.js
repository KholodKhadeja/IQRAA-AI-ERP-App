/* Leads List + Details (screens.md §7).

   2026-09-22 "Connect Leads to Airtable": this list now renders real
   records from js/services/leads-api.js (GET /api/leads on the existing
   backend, which reads the Airtable Leads table) instead of js/data/
   mock-data.js's data.leads. A fresh fetch runs every time this page
   loads — see loadLeads() below — so changing a lead's Status in
   Airtable and reloading this page reflects the change immediately.

   **Status filter**: the backend already filters to Status = "Meeting
   Booking" server-side (the real option — "BOOKING MEETING" doesn't
   exist, see backend/server.js's Leads section and CLAUDE.md). This
   file re-checks that filter client-side as a defensive second layer
   per that task's explicit instruction — matchesFilters() below asserts
   lead.status === LEADS_STATUS_FILTER in addition to the search/status
   dropdown filters, so a backend bug could never leak an unrelated lead
   onto this page even if the server-side filter were ever removed.

   Known scope limits (documented, not bugs): the Leads table has no
   field for product/service interest, assigned-to owner, or a separate
   "last activity" timestamp — the mock data this replaced invented all
   three. Those columns/rows show a placeholder ("—") instead of fake
   data. Create/Edit are deliberately inert (CLAUDE.md §18's external-
   integration-placeholder pattern) rather than silently mutating an
   in-memory array that would vanish on the next real fetch — writing
   leads back to Airtable was explicitly out of scope for this task. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.leadsApi;
    if (!ph || !api) return;

    var LEADS_STATUS_FILTER = "Meeting Booking";
    var PLACEHOLDER = "—";

    var searchInput = document.getElementById("leads-search");
    var statusSelect = document.getElementById("leads-filter-status");
    var createBtn = document.getElementById("leads-create-btn");

    var allLeads = [];

    function renderLoading() {
      document.getElementById("leads-list-body").innerHTML =
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
        ns.i18n.t("leads.loading") +
        "</p>";
    }

    function renderError() {
      document.getElementById("leads-list-body").innerHTML =
        '<div class="panel__empty">' +
        "<p>" + ns.i18n.t("leads.loadError") + "</p>" +
        '<button type="button" class="btn btn--secondary" id="leads-retry-btn">' + ns.i18n.t("leads.retry") + "</button>" +
        "</div>";
      var retryBtn = document.getElementById("leads-retry-btn");
      if (retryBtn) retryBtn.addEventListener("click", loadLeads);
    }

    function populateFilters() {
      var previous = statusSelect.value;
      var statusValues = [];
      allLeads.forEach(function (lead) {
        if (lead.status && statusValues.indexOf(lead.status) === -1) statusValues.push(lead.status);
      });
      var statusOptions = statusValues
        .map(function (statusLabelText) {
          return '<option value="' + statusLabelText + '">' + statusLabelText + "</option>";
        })
        .join("");
      statusSelect.innerHTML = '<option value="">' + ns.i18n.t("leads.allStatuses") + "</option>" + statusOptions;
      statusSelect.value = previous;
    }

    /* Defensive client-side check (see file-header comment) on top of
       the search/status-dropdown filters a viewer can apply. */
    function matchesFilters(lead) {
      if (lead.status !== LEADS_STATUS_FILTER) return false;
      var query = searchInput.value.trim().toLowerCase();
      if (query) {
        var name = (lead.name || "").toLowerCase();
        var org = (lead.org || "").toLowerCase();
        if (name.indexOf(query) === -1 && org.indexOf(query) === -1) return false;
      }
      if (statusSelect.value !== "" && lead.status !== statusSelect.value) return false;
      return true;
    }

    function renderTable() {
      var host = document.getElementById("leads-list-body");
      var leads = allLeads.filter(matchesFilters);
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
            '<td data-label="' + ns.i18n.t("leadFields.name") + '"><button type="button" class="data-table__primary" data-lead-open="' + lead.id + '">' + (lead.name || PLACEHOLDER) + "</button></td>" +
            '<td data-label="' + ns.i18n.t("leadFields.org") + '">' + (lead.org || PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.service") + '">' + PLACEHOLDER + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.status") + '">' + ph.badge(lead.status || PLACEHOLDER, "info") + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.assignedTo") + '">' + ns.i18n.t("projectFields.unassigned") + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.lastActivity") + '">' + PLACEHOLDER + "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";

      host.querySelectorAll("[data-lead-open]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var lead = allLeads.filter(function (l) {
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
        fieldRow("leadFields.org", lead.org || PLACEHOLDER) +
        fieldRow("leadFields.email", lead.email || PLACEHOLDER) +
        fieldRow("leadFields.phone", lead.phone || PLACEHOLDER) +
        fieldRow("leadFields.status", ph.badge(lead.status || PLACEHOLDER, "info")) +
        fieldRow("leadFields.created", lead.created ? ph.formatDate(lead.created.slice(0, 10)) : PLACEHOLDER) +
        fieldRow("leads.messageLabel", lead.message || PLACEHOLDER) +
        '<p class="note-text">' + ns.i18n.t("leads.writeNotConnected") + "</p>";
      ns.components.modal.open(lead.name || PLACEHOLDER, body);
    }

    function loadLeads() {
      renderLoading();
      api
        .getLeads()
        .then(function (leads) {
          allLeads = leads;
          populateFilters();
          renderTable();
        })
        .catch(function (err) {
          console.error("[leads] Failed to load leads from the backend:", err);
          renderError();
        });
    }

    searchInput.addEventListener("input", renderTable);
    statusSelect.addEventListener("change", renderTable);
    createBtn.addEventListener("click", function () {
      ns.components.modal.open(ns.i18n.t("leads.createTitle"), '<p class="note-text">' + ns.i18n.t("leads.writeNotConnected") + "</p>");
    });

    loadLeads();
  });
})(window.IQRAA);
