/* Client Overview (screens.md §23). Answers "where is my project now?" —
   deliberately thin compared to Admin/PM/Team Member Overview: no internal
   dashboards, workload or technical detail (CLAUDE.md §4/§6). Each project
   card here only shows what a client should see: name, progress, stage,
   expected completion, a link into the client-safe Project View
   (client-project.html), and whether it currently needs the client's
   action (approval/review stage — ph.needsClientAction). */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    if (!data || !ph) return;

    var myProjects = ph.projectsForClient(data.currentClientId);

    function renderProjects() {
      var host = document.getElementById("client-projects-list");
      if (myProjects.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("clientProject.noProjectsHeading") + "</p>";
        return;
      }
      host.innerHTML = myProjects
        .map(function (p) {
          return (
            '<div class="panel">' +
            '<div class="panel__header">' +
            '<span class="panel__title">' + p.name + "</span>" +
            ph.statusBadge(p.status) +
            "</div>" +
            '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + p.progress + '%"></div></div>' +
            ph.fieldRow("projectFields.stage", ph.stageLabel(p.stageKey)) +
            ph.fieldRow("projectWorkspace.expectedCompletion", ph.formatDate(p.deadline)) +
            '<a class="btn btn--secondary" href="client-project.html?id=' + p.id + '">' + ns.i18n.t("clientOverview.viewProject") + "</a>" +
            "</div>"
          );
        })
        .join("");
    }

    function renderPendingActions() {
      var host = document.getElementById("client-pending-actions");
      var pending = myProjects.filter(ph.needsClientAction);
      if (pending.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("clientOverview.emptyPendingActions") + "</p>";
        return;
      }
      host.innerHTML = pending
        .map(function (p) {
          return (
            '<div class="activity-item">' +
            '<span class="activity-item__icon" aria-hidden="true">' + ns.icons.alertTriangle(16) + "</span>" +
            '<span class="activity-item__body">' +
            '<span class="activity-item__text"><a class="data-table__primary" href="client-project.html?id=' + p.id + '">' + p.name + "</a> — " +
            ns.i18n.t("clientProject.approvalHeading") + "</span>" +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    function renderAll() {
      renderProjects();
      renderPendingActions();
    }

    renderAll();
  });
})(window.IQRAA);
