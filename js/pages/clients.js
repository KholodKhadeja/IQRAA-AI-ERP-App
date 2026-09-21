/* Clients List + Details (screens.md §8). Details is the shared modal
   component, not a dedicated page — same rationale as js/pages/leads.js.

   2026-09-22b "Connect Clients to Airtable": this list now renders real
   records from js/services/clients-api.js (GET /api/clients on the
   existing backend, Admin-only — see backend/server.js) instead of
   js/data/mock-data.js's data.clients. A fresh fetch runs every time this
   page loads, and Active/Completed project counts are derived
   server-side from the real Clients->Projects linked-record relationship
   (the existing Airtable relationship, not a new one) so they can never
   drift out of sync with real project data.

   Known scope limits (documented, not bugs): the real Clients table has
   no dedicated "contact person" field, no Status field, and no "last
   activity" field — the mock data this replaced invented all three.
   "Contact" shows a placeholder in both the list and the details view;
   Organization (a real field) is shown in the details view instead,
   in the same visual slot the mock "contact name" row used to occupy. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.clientsApi;
    if (!ph || !api) return;

    var PLACEHOLDER = "—";
    var searchInput = document.getElementById("clients-search");
    var allClients = [];

    function renderLoading() {
      document.getElementById("clients-list-body").innerHTML =
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
        ns.i18n.t("clients.loading") +
        "</p>";
    }

    function renderError() {
      document.getElementById("clients-list-body").innerHTML =
        '<div class="panel__empty">' +
        "<p>" + ns.i18n.t("clients.loadError") + "</p>" +
        '<button type="button" class="btn btn--secondary" id="clients-retry-btn">' + ns.i18n.t("clients.retry") + "</button>" +
        "</div>";
      var retryBtn = document.getElementById("clients-retry-btn");
      if (retryBtn) retryBtn.addEventListener("click", loadClients);
    }

    function matchesFilters(client) {
      var query = searchInput.value.trim().toLowerCase();
      if (!query) return true;
      var name = (client.name || "").toLowerCase();
      var org = (client.organization || "").toLowerCase();
      return name.indexOf(query) !== -1 || org.indexOf(query) !== -1;
    }

    function openClientDetails(client) {
      var projectsHtml =
        client.projects.length === 0
          ? '<p class="panel__empty">' + ns.i18n.t("clients.noProjects") + "</p>"
          : "<div>" +
            client.projects
              .map(function (p) {
                return (
                  '<div class="list-row">' +
                  '<span class="list-row__title">' +
                  '<a class="data-table__primary" href="' + ph.projectLink(p.id) + '">' + (p.name || PLACEHOLDER) + "</a>" +
                  "</span>" +
                  ph.airtableStatusBadge(p.status) +
                  "</div>"
                );
              })
              .join("") +
            "</div>";

      var body =
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t("clientFields.organization") + "</span>" +
        '<span class="field-row__value">' + (client.organization || PLACEHOLDER) + "</span>" +
        "</div>" +
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t("clientFields.email") + "</span>" +
        '<span class="field-row__value">' + (client.email || PLACEHOLDER) + "</span>" +
        "</div>" +
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t("clientFields.phone") + "</span>" +
        '<span class="field-row__value">' + (client.phone || PLACEHOLDER) + "</span>" +
        "</div>" +
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t("clientFields.activeProjects") + "</span>" +
        '<span class="field-row__value">' + client.activeProjects + "</span>" +
        "</div>" +
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t("clients.relatedProjectsHeading") + "</span>" +
        projectsHtml +
        "</div>";

      ns.components.modal.open(client.name || PLACEHOLDER, body);
    }

    function renderTable() {
      var host = document.getElementById("clients-list-body");
      var clients = allClients.filter(matchesFilters);
      if (clients.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("clients.emptyResults") + "</p>";
        return;
      }
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("projectFields.client") + "</th>" +
        "<th>" + ns.i18n.t("clientFields.contact") + "</th>" +
        "<th>" + ns.i18n.t("clientFields.email") + "</th>" +
        "<th>" + ns.i18n.t("clientFields.activeProjects") + "</th>" +
        "<th>" + ns.i18n.t("clientFields.completedProjects") + "</th>" +
        "</tr>";
      var rows = clients
        .map(function (client) {
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("projectFields.client") + '">' +
            '<button type="button" class="data-table__primary" data-client-open="' + client.id + '">' + (client.name || PLACEHOLDER) + "</button>" +
            "</td>" +
            '<td data-label="' + ns.i18n.t("clientFields.contact") + '">' + PLACEHOLDER + "</td>" +
            '<td data-label="' + ns.i18n.t("clientFields.email") + '">' + (client.email || PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("clientFields.activeProjects") + '">' + client.activeProjects + "</td>" +
            '<td data-label="' + ns.i18n.t("clientFields.completedProjects") + '">' + client.completedProjects + "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";

      host.querySelectorAll("[data-client-open]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var client = allClients.filter(function (c) {
            return c.id === btn.getAttribute("data-client-open");
          })[0];
          if (client) openClientDetails(client);
        });
      });
    }

    function loadClients() {
      renderLoading();
      api
        .getClients()
        .then(function (clients) {
          allClients = clients;
          renderTable();
        })
        .catch(function (err) {
          console.error("[clients] Failed to load clients from the backend:", err);
          renderError();
        });
    }

    searchInput.addEventListener("input", renderTable);
    loadClients();
  });
})(window.IQRAA);
