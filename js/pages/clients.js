/* Clients List + Details (screens.md §8). Details is the shared modal
   component, not a dedicated page — same rationale as js/pages/leads.js.
   "Active projects" / "completed projects" counts are derived from
   data.projects at render time, not stored on the client record, so they
   can never drift out of sync with the actual project data. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    if (!data || !ph) return;

    var searchInput = document.getElementById("clients-search");

    function projectsForClient(clientId) {
      return data.projects.filter(function (p) {
        return p.clientId === clientId;
      });
    }

    function matchesFilters(client) {
      var query = searchInput.value.trim().toLowerCase();
      return !query || client.name.toLowerCase().indexOf(query) !== -1 || client.contactName.toLowerCase().indexOf(query) !== -1;
    }

    function openClientDetails(client) {
      var projects = projectsForClient(client.id);
      var active = projects.filter(function (p) {
        return p.status !== "readyToStart";
      });

      var projectsHtml =
        projects.length === 0
          ? '<p class="panel__empty">' + ns.i18n.t("clients.noProjects") + "</p>"
          : "<div>" +
            projects
              .map(function (p) {
                return (
                  '<div class="list-row">' +
                  '<span class="list-row__title">' +
                  '<a class="data-table__primary" href="' + ph.projectLink(p.id) + '">' + p.name + "</a>" +
                  "</span>" +
                  ph.statusBadge(p.status) +
                  "</div>"
                );
              })
              .join("") +
            "</div>";

      var body =
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t("clientFields.contact") + "</span>" +
        '<span class="field-row__value">' + client.contactName + "</span>" +
        "</div>" +
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t("clientFields.email") + "</span>" +
        '<span class="field-row__value">' + client.contactEmail + "</span>" +
        "</div>" +
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t("clientFields.phone") + "</span>" +
        '<span class="field-row__value">' + client.contactPhone + "</span>" +
        "</div>" +
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t("clientFields.activeProjects") + "</span>" +
        '<span class="field-row__value">' + active.length + "</span>" +
        "</div>" +
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t("clients.relatedProjectsHeading") + "</span>" +
        projectsHtml +
        "</div>";

      ns.components.modal.open(client.name, body);
    }

    function renderTable() {
      var host = document.getElementById("clients-list-body");
      var clients = data.clients.filter(matchesFilters);
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
          var projects = projectsForClient(client.id);
          var active = projects.filter(function (p) {
            return p.status !== "readyToStart" && p.status !== "completed";
          });
          var completed = projects.filter(function (p) {
            return p.status === "completed";
          });
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("projectFields.client") + '">' +
            '<button type="button" class="data-table__primary" data-client-open="' + client.id + '">' + client.name + "</button>" +
            "</td>" +
            '<td data-label="' + ns.i18n.t("clientFields.contact") + '">' + client.contactName + "</td>" +
            '<td data-label="' + ns.i18n.t("clientFields.email") + '">' + client.contactEmail + "</td>" +
            '<td data-label="' + ns.i18n.t("clientFields.activeProjects") + '">' + active.length + "</td>" +
            '<td data-label="' + ns.i18n.t("clientFields.completedProjects") + '">' + completed.length + "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";

      host.querySelectorAll("[data-client-open]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var client = data.clients.filter(function (c) {
            return c.id === btn.getAttribute("data-client-open");
          })[0];
          if (client) openClientDetails(client);
        });
      });
    }

    searchInput.addEventListener("input", renderTable);
    renderTable();
  });
})(window.IQRAA);
