/* Team Member "My Workspace" (screens.md §17). Answers "what do I need to
   do?" — a compact focus list (today's + overdue tasks), not the full
   sortable list that js/pages/my-tasks.js provides. Reuses the same
   ph.renderProjectsTable/renderActivityList as Admin/PM Overview.

   2026-09-22 "Connect Team pages to Airtable": the current user is now
   the REAL authenticated session user (ns.workspaceAuthReady, resolved
   from GET /api/auth/me by js/workspace-chrome.js — the same session
   check that already gates access to this page, reused here rather than
   a second auth call), not the hardcoded data.currentTeamMemberId mock
   identity. A Team Member can no longer see someone else's mock
   "assigned to me" data just because the JS happened to hardcode a
   fixed id — this page now always scopes to whoever is actually logged
   in.

   Known scope limit (documented, not a bug): data.tasks/data.projects
   are still the mock dataset from js/data/mock-data.js — Tasks/Projects
   aren't wired to real Airtable Users yet (that's a separate, larger
   task per CLAUDE.md's "don't build a new data architecture" guidance).
   Since the mock records are keyed by fake "tm-N" ids that don't match
   any real Airtable session id, every KPI/focus/project/activity section
   below will correctly show empty for a real logged-in user until a
   future task links real Tasks/Projects to real Users — that's the
   honest result of scoping to the real session, not a bug to "fix" by
   reintroducing a hardcoded id. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  ns.workspaceAuthReady.then(function (session) {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    if (!data || !ph) return;

    var currentUserId = session.user.id;

    var myProjects = ph.projectsForTeamMember(currentUserId);
    var myProjectIds = myProjects.map(function (p) {
      return p.id;
    });
    var myTasks = data.tasks.filter(function (t) {
      return t.assigneeId === currentUserId;
    });

    function isToday(iso) {
      if (!iso) return false;
      return iso === new Date().toISOString().slice(0, 10);
    }

    function focusTasks() {
      return myTasks.filter(function (t) {
        return t.status !== "completed" && (isToday(t.dueDate) || ph.isOverdue(t.dueDate));
      });
    }

    function kpiIcon(name) {
      return '<span class="kpi-card__icon" aria-hidden="true">' + ns.icons[name](20) + "</span>";
    }

    function renderKpis() {
      var openTasks = myTasks.filter(function (t) {
        return t.status !== "completed";
      });
      var items = [
        { icon: "calendar", value: myTasks.filter(function (t) { return t.status !== "completed" && isToday(t.dueDate); }).length, labelKey: "myWorkspace.kpiTasksToday" },
        { icon: "clock", value: openTasks.filter(function (t) { return ph.isOverdue(t.dueDate); }).length, labelKey: "myWorkspace.kpiTasksOverdue" },
        { icon: "listChecks", value: myTasks.filter(function (t) { return t.status === "inProgress"; }).length, labelKey: "myWorkspace.kpiTasksInProgress" },
        { icon: "folder", value: myProjects.length, labelKey: "myWorkspace.kpiMyProjects" }
      ];
      document.getElementById("team-kpi-grid").innerHTML = items
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

    function renderFocus() {
      var host = document.getElementById("team-focus-list");
      var tasks = focusTasks();
      if (tasks.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("myWorkspace.emptyFocus") + "</p>";
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
      renderFocus();
      ph.renderProjectsTable("team-projects-body", myProjects, "adminOverview.emptyActiveProjects");
      var myActivity = data.recentActivity.filter(function (a) {
        return a.projectId && myProjectIds.indexOf(a.projectId) !== -1;
      });
      ph.renderActivityList("team-activity-list", myActivity);
    }

    renderAll();
  });
})(window.IQRAA);
