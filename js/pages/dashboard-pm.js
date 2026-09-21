/* PM Overview (screens.md §18). Reuses the exact same table/stage-summary/
   activity render functions as Admin Overview (services/project-helpers.js)
   with the projects array pre-filtered to the demo-logged-in PM
   (data.currentPmId — CLAUDE.md §9/§5) instead of a second copy of that
   markup-building code. "Tasks requiring attention" is PM-specific (not
   reused elsewhere yet) so it stays local to this file. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    if (!data || !ph) return;

    var myProjects = ph.projectsForPm(data.currentPmId);
    var myProjectIds = myProjects.map(function (p) {
      return p.id;
    });

    function attentionTasks() {
      return ph.tasksForProjects(myProjectIds).filter(function (t) {
        if (t.status === "completed") return false;
        return t.status === "waiting" || t.status === "review" || ph.isOverdue(t.dueDate);
      });
    }

    function upcomingDeadlineCount() {
      var now = new Date();
      var in7Days = new Date();
      in7Days.setDate(now.getDate() + 7);
      return myProjects.filter(function (p) {
        if (!p.deadline) return false;
        var d = new Date(p.deadline);
        return d >= now && d <= in7Days;
      }).length;
    }

    function kpiIcon(name) {
      return '<span class="kpi-card__icon" aria-hidden="true">' + ns.icons[name](20) + "</span>";
    }

    function renderKpis() {
      var tasksNeedingAttention = attentionTasks();
      var overdueTasks = tasksNeedingAttention.filter(function (t) {
        return ph.isOverdue(t.dueDate);
      });
      var items = [
        { icon: "folder", value: myProjects.length, labelKey: "pmOverview.kpiActiveProjects" },
        { icon: "alertTriangle", value: tasksNeedingAttention.length, labelKey: "pmOverview.kpiTasksAttention" },
        { icon: "clock", value: overdueTasks.length, labelKey: "pmOverview.kpiOverdueTasks" },
        { icon: "calendar", value: upcomingDeadlineCount(), labelKey: "pmOverview.kpiUpcomingDeadlines" }
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

    function renderAttentionTasks() {
      var host = document.getElementById("pm-attention-tasks");
      var tasks = attentionTasks();
      if (tasks.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("pmOverview.noAttentionTasks") + "</p>";
        return;
      }
      host.innerHTML = tasks
        .map(function (task) {
          var project = ph.getProject(task.projectId);
          var overdue = ph.isOverdue(task.dueDate);
          var dueLabel = ph.formatDate(task.dueDate) + (overdue ? ns.i18n.t("projectWorkspace.taskOverdueSuffix") : "");
          return (
            '<div class="activity-item">' +
            '<span class="activity-item__icon" aria-hidden="true">' + ns.icons.listChecks(16) + "</span>" +
            '<span class="activity-item__body">' +
            '<span class="activity-item__text"><a class="data-table__primary" href="' + ph.projectLink(task.projectId) + '">' +
            (project ? project.name : "") + "</a> — " + task.title + "</span>" +
            '<span class="activity-item__meta' + (overdue ? " task-card__due--overdue" : "") + '">' + dueLabel + "</span>" +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    function renderAll() {
      renderKpis();
      ph.renderProjectsTable("pm-projects-body", myProjects, "adminOverview.emptyActiveProjects");
      renderAttentionTasks();
      var myActivity = data.recentActivity.filter(function (a) {
        return a.projectId && myProjectIds.indexOf(a.projectId) !== -1;
      });
      ph.renderActivityList("pm-activity-list", myActivity);
    }

    renderAll();
    ns.i18n.onLanguageChange(renderAll);
  });
})(window.IQRAA);
