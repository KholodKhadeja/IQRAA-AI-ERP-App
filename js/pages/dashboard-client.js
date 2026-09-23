/* Client Overview (screens.md §23). Answers "where is my project now?" —
   deliberately thin compared to Admin/PM/Team Member Overview: no internal
   dashboards, workload or technical detail (CLAUDE.md §4/§6). Each project
   card here only shows what a client should see: name, progress, stage,
   expected completion, a link into the client-safe Project View
   (client-project.html), and whether it currently needs the client's
   action (approval/review stage).

   IQRAA Client Dashboard Phase 2 (2026-09-23): this now fetches real data
   from js/services/clients-api.js's getMyClientProjects() (GET
   /api/clients/me), fresh on every page load, the same
   authenticated-session-scoped endpoint client-project.js already uses —
   see that file's header comment for the full security explanation. There
   is no client-, project- or URL-supplied id anywhere in this flow: the
   backend derives the caller's own project(s) purely from the session, so
   there is nothing here that could be changed via a query parameter to see
   another client's data. js/data/mock-data.js is still loaded (same as
   client-project.html) purely for its `pipelineStages` reference table,
   which ph.stageLabel()/ph.airtableStageLabel() use to resolve a stage key
   to its Hebrew label — that's shared reference data, not the mock
   project/client business data this task removes. Nothing below reads
   data.projects, data.clients, or data.currentClientId anymore. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.clientsApi;
    var projectsHost = document.getElementById("client-projects-list");
    var pendingHost = document.getElementById("client-pending-actions");
    if (!ph || !api || !projectsHost || !pendingHost) return;

    var CLIENT_ACTION_STAGES = ["clientScriptApproval", "clientReview", "clientApproval"];

    function needsClientAction(project) {
      return CLIENT_ACTION_STAGES.indexOf(ph.airtableStageKey(project.stage)) !== -1;
    }

    function renderLoading() {
      var loadingHtml =
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' +
        ns.icons.loader2(16) +
        "</span> " +
        ns.i18n.t("clientProject.loading") +
        "</p>";
      projectsHost.innerHTML = loadingHtml;
      pendingHost.innerHTML = loadingHtml;
    }

    function renderErrorState() {
      projectsHost.innerHTML =
        '<div class="panel__empty">' +
        "<p>" + ns.i18n.t("clientProject.loadError") + "</p>" +
        '<button type="button" class="btn btn--secondary" id="client-overview-retry-btn">' +
        ns.i18n.t("clientProject.retry") +
        "</button>" +
        "</div>";
      pendingHost.innerHTML = "";
      var retryBtn = document.getElementById("client-overview-retry-btn");
      if (retryBtn) retryBtn.addEventListener("click", loadAndRender);
    }

    function renderProjects(projects) {
      if (projects.length === 0) {
        projectsHost.innerHTML = '<p class="panel__empty">' + ns.i18n.t("clientProject.noProjectsHeading") + "</p>";
        return;
      }
      projectsHost.innerHTML = projects
        .map(function (p) {
          return (
            '<div class="panel">' +
            '<div class="panel__header">' +
            '<span class="panel__title">' + (p.name || ns.i18n.t("projectFields.unassigned")) + "</span>" +
            ph.airtableStatusBadge(p.status) +
            "</div>" +
            '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + (p.progress || 0) + '%"></div></div>' +
            ph.fieldRow("projectFields.stage", ph.airtableStageLabel(p.stage)) +
            ph.fieldRow("projectWorkspace.expectedCompletion", ph.formatDate(p.expectedCompletion)) +
            '<a class="btn btn--secondary" href="client-project.html?id=' + p.id + '">' + ns.i18n.t("clientOverview.viewProject") + "</a>" +
            "</div>"
          );
        })
        .join("");
    }

    function renderPendingActions(projects) {
      var pending = projects.filter(needsClientAction);
      if (pending.length === 0) {
        pendingHost.innerHTML = '<p class="panel__empty">' + ns.i18n.t("clientOverview.emptyPendingActions") + "</p>";
        return;
      }
      pendingHost.innerHTML = pending
        .map(function (p) {
          return (
            '<div class="activity-item">' +
            '<span class="activity-item__icon" aria-hidden="true">' + ns.icons.alertTriangle(16) + "</span>" +
            '<span class="activity-item__body">' +
            '<span class="activity-item__text"><a class="data-table__primary" href="client-project.html?id=' + p.id + '">' +
            (p.name || ns.i18n.t("projectFields.unassigned")) +
            "</a> — " +
            ns.i18n.t("clientProject.approvalHeading") +
            "</span>" +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    function loadAndRender() {
      renderLoading();
      api
        .getMyClientProjects()
        .then(function (result) {
          var projects = (result && result.projects) || [];
          renderProjects(projects);
          renderPendingActions(projects);
        })
        .catch(function (err) {
          /* A 403 here means this session isn't linked to any Clients
             record — treated the same as "no projects" rather than a
             distinct error, so it never hints at what a different account
             might see. Same handling as client-project.js. */
          if (err && err.status === 403) {
            renderProjects([]);
            renderPendingActions([]);
            return;
          }
          console.error("[dashboard-client] Failed to load client/project data from the backend:", err);
          renderErrorState();
        });
    }

    loadAndRender();
  });
})(window.IQRAA);
