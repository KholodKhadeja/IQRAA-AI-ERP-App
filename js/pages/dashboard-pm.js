/* PM Overview content (screens.md §18/§38 Step 3).

   2026-09-22c "Connect PM Dashboard to Airtable": this page now renders
   real, live-computed data from js/services/dashboard-api.js's
   getPmDashboard() (GET /api/dashboard/pm on the existing backend, which
   reads Projects/Tasks/Meetings & Decisions from Airtable, filters
   everything server-side to the AUTHENTICATED PM's own projects, and
   returns one aggregated JSON summary) instead of js/data/mock-data.js's
   data.currentPmId/data.projects/data.tasks/data.recentActivity. A fresh
   fetch runs every time this page loads (see loadDashboard() below) —
   nothing is cached client-side across loads, so editing a record in
   Airtable and reloading this page reflects the change. The backend
   identifies the PM from the session cookie alone; nothing here can ever
   ask for a different PM's data by supplying an id (CLAUDE.md's "never
   trust a frontend-supplied identity for authorization" rule).

   js/data/mock-data.js + js/services/project-helpers.js are still loaded
   (see pages/dashboard-pm.html) purely for their pure formatting/label
   helpers that don't depend on mock records — ph.formatDate/badge/
   projectLink/airtableStageLabel/airtableStatusBadge — the exact same
   reuse pattern already established by js/pages/dashboard-admin.js.

   Known, documented scope limit (not a bug — see backend/server.js's PM
   Dashboard section for the full reasoning): "Pending Client Feedback"
   and "Pending Approvals" (both concepts CLAUDE.md's task brief for this
   screen describes, derivable from Projects.Current Stage) are not
   computed here because the existing UI below — preserved unchanged per
   this task's "do not redesign" instruction — has no KPI card or panel
   for either one. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.dashboardApi;
    if (!ph || !api) return;

    var SECTION_IDS = ["pm-kpi-grid", "pm-projects-body", "pm-attention-tasks", "pm-activity-list"];

    function kpiIcon(name) {
      return '<span class="kpi-card__icon" aria-hidden="true">' + ns.icons[name](20) + "</span>";
    }

    function renderLoading() {
      SECTION_IDS.forEach(function (id) {
        var host = document.getElementById(id);
        if (!host) return;
        host.innerHTML =
          '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
          ns.i18n.t("pmOverview.loading") +
          "</p>";
      });
    }

    function renderError() {
      SECTION_IDS.forEach(function (id) {
        var host = document.getElementById(id);
        if (!host) return;
        host.innerHTML =
          '<div class="panel__empty">' +
          "<p>" + ns.i18n.t("pmOverview.loadError") + "</p>" +
          '<button type="button" class="btn btn--secondary" data-dashboard-retry>' + ns.i18n.t("pmOverview.retry") + "</button>" +
          "</div>";
      });
      document.querySelectorAll("[data-dashboard-retry]").forEach(function (btn) {
        btn.addEventListener("click", loadDashboard);
      });
    }

    function renderKpis(kpis) {
      var items = [
        { icon: "folder", value: kpis.activeProjects, labelKey: "pmOverview.kpiActiveProjects" },
        { icon: "alertTriangle", value: kpis.tasksNeedingAttention, labelKey: "pmOverview.kpiTasksAttention" },
        { icon: "clock", value: kpis.overdueTasks, labelKey: "pmOverview.kpiOverdueTasks" },
        { icon: "calendar", value: kpis.upcomingDeadlines, labelKey: "pmOverview.kpiUpcomingDeadlines" }
      ];
      document.getElementById("pm-kpi-grid").innerHTML = items
        .map(function (item) {
          return (
            '<div class="kpi-card">' +
            kpiIcon(item.icon) +
            '<span class="kpi-card__value">' + item.value + "</span>" +
            '<span class="kpi-card__label">' + ns.i18n.t(item.labelKey) + "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    function renderMyProjects(projects) {
      var host = document.getElementById("pm-projects-body");
      if (projects.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("pmOverview.emptyMyProjects") + "</p>";
        return;
      }
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("projectFields.project") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.client") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.stage") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.progress") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.deadline") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.status") + "</th>" +
        "</tr>";
      var rows = projects
        .map(function (p) {
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("projectFields.project") + '">' +
            '<a class="data-table__primary" href="' + ph.projectLink(p.id) + '">' + (p.name || ns.i18n.t("projectFields.unassigned")) + "</a>" +
            "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.client") + '">' + (p.client || ns.i18n.t("projectFields.unassigned")) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.stage") + '">' + ph.airtableStageLabel(p.stage) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.progress") + '">' +
            '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + (p.progress || 0) + '%"></div></div>' +
            "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.deadline") + '">' + ph.formatDate(p.deadline) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.status") + '">' + ph.airtableStatusBadge(p.status) + "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";
    }

    function renderAttentionTasks(tasks) {
      var host = document.getElementById("pm-attention-tasks");
      if (tasks.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("pmOverview.noAttentionTasks") + "</p>";
        return;
      }
      host.innerHTML = tasks
        .map(function (task) {
          var dueLabel = ph.formatDate(task.dueDate) + (task.overdue ? ns.i18n.t("projectWorkspace.taskOverdueSuffix") : "");
          var projectHtml = task.projectId
            ? '<a class="data-table__primary" href="' + ph.projectLink(task.projectId) + '">' + (task.projectName || ns.i18n.t("projectFields.unassigned")) + "</a>"
            : ns.i18n.t("projectFields.unassigned");
          return (
            '<div class="activity-item">' +
            '<span class="activity-item__icon" aria-hidden="true">' + ns.icons.listChecks(16) + "</span>" +
            '<span class="activity-item__body">' +
            '<span class="activity-item__text">' + projectHtml + " — " + (task.title || "") + "</span>" +
            '<span class="activity-item__meta' + (task.overdue ? " task-card__due--overdue" : "") + '">' + dueLabel + "</span>" +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    function renderRecentActivity(meetings) {
      var host = document.getElementById("pm-activity-list");
      if (meetings.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("adminOverview.emptyActivity") + "</p>";
        return;
      }
      host.innerHTML = meetings
        .map(function (meeting) {
          var projectHtml = meeting.projectId
            ? '<a class="data-table__primary" href="' + ph.projectLink(meeting.projectId) + '">' + (meeting.projectName || ns.i18n.t("projectFields.unassigned")) + "</a>"
            : ns.i18n.t("projectFields.unassigned");
          return (
            '<div class="activity-item">' +
            '<span class="activity-item__icon" aria-hidden="true">' + ns.icons.calendar(16) + "</span>" +
            '<span class="activity-item__body">' +
            '<span class="activity-item__text">' + projectHtml + (meeting.summary ? " — " + meeting.summary : "") + "</span>" +
            '<span class="activity-item__meta">' + ph.formatDate(meeting.date) + "</span>" +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    function renderAll(dashboard) {
      renderKpis(dashboard.kpis);
      renderMyProjects(dashboard.myProjects);
      renderAttentionTasks(dashboard.attentionTasks);
      renderRecentActivity(dashboard.recentActivity);
    }

    function loadDashboard() {
      renderLoading();
      api
        .getPmDashboard()
        .then(function (dashboard) {
          renderAll(dashboard);
        })
        .catch(function (err) {
          console.error("[dashboard-pm] Failed to load dashboard data from the backend:", err);
          renderError();
        });
    }

    loadDashboard();
  });
})(window.IQRAA);
