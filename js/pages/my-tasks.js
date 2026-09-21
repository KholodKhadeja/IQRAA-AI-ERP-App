/* My Tasks (screens.md §17): every task assigned to the demo-logged-in
   team member, across all their projects, with search + status/priority
   filters and a "quick status update" select per row that mutates
   data.tasks in place (same real-in-memory-mutation pattern as Admin
   Overview's "assign PM" and Team Management's pause/reactivate). */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    if (!data || !ph) return;

    var STATUS_KEYS = ["notStarted", "inProgress", "waiting", "review", "completed"];
    var PRIORITY_KEYS = ["low", "medium", "high"];

    var searchInput = document.getElementById("my-tasks-search");
    var statusSelect = document.getElementById("my-tasks-filter-status");
    var prioritySelect = document.getElementById("my-tasks-filter-priority");

    function myTasks() {
      return data.tasks.filter(function (t) {
        return t.assigneeId === data.currentTeamMemberId;
      });
    }

    function populateFilters() {
      var previousStatus = statusSelect.value;
      var previousPriority = prioritySelect.value;

      statusSelect.innerHTML =
        '<option value="">' + ns.i18n.t("projects.allStatuses") + "</option>" +
        STATUS_KEYS.map(function (s) {
          return '<option value="' + s + '">' + ns.i18n.t("taskStatus." + s) + "</option>";
        }).join("");

      prioritySelect.innerHTML =
        '<option value="">' + ns.i18n.t("myTasks.allPriorities") + "</option>" +
        PRIORITY_KEYS.map(function (p) {
          return '<option value="' + p + '">' + ns.i18n.t("priority." + p) + "</option>";
        }).join("");

      statusSelect.value = previousStatus;
      prioritySelect.value = previousPriority;
    }

    function matchesFilters(task) {
      var query = searchInput.value.trim().toLowerCase();
      if (query && task.title.toLowerCase().indexOf(query) === -1) return false;
      if (statusSelect.value !== "" && task.status !== statusSelect.value) return false;
      if (prioritySelect.value !== "" && task.priority !== prioritySelect.value) return false;
      return true;
    }

    function renderTable() {
      var host = document.getElementById("my-tasks-list-body");
      var tasks = myTasks().filter(matchesFilters);
      if (tasks.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("myTasks.emptyResults") + "</p>";
        return;
      }
      var statusOptions = STATUS_KEYS.map(function (s) {
        return '<option value="' + s + '">' + ns.i18n.t("taskStatus." + s) + "</option>";
      }).join("");

      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("taskFields.title") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.project") + "</th>" +
        "<th>" + ns.i18n.t("taskFields.priority") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.deadline") + "</th>" +
        "<th>" + ns.i18n.t("myTasks.quickStatusLabel") + "</th>" +
        "</tr>";
      var rows = tasks
        .map(function (task) {
          var project = ph.getProject(task.projectId);
          var overdue = task.status !== "completed" && ph.isOverdue(task.dueDate);
          var dueLabel = ph.formatDate(task.dueDate) + (overdue ? ns.i18n.t("projectWorkspace.taskOverdueSuffix") : "");
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("taskFields.title") + '">' + task.title + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.project") + '"><a class="data-table__primary" href="' + ph.projectLink(task.projectId) + '">' +
            (project ? project.name : "") + "</a></td>" +
            '<td data-label="' + ns.i18n.t("taskFields.priority") + '">' + ph.priorityBadge(task.priority) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.deadline") + '" class="' + (overdue ? "task-card__due--overdue" : "") + '">' + dueLabel + "</td>" +
            '<td data-label="' + ns.i18n.t("myTasks.quickStatusLabel") + '">' +
            '<select class="select" data-task-status="' + task.id + '" aria-label="' + ns.i18n.t("myTasks.quickStatusLabel") + '">' +
            statusOptions +
            "</select>" +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";

      host.querySelectorAll("[data-task-status]").forEach(function (select) {
        var task = tasks.filter(function (t) {
          return t.id === select.getAttribute("data-task-status");
        })[0];
        if (task) select.value = task.status;
        select.addEventListener("change", function () {
          if (task) task.status = select.value;
          renderTable();
        });
      });
    }

    function renderAll() {
      populateFilters();
      renderTable();
    }

    searchInput.addEventListener("input", renderTable);
    statusSelect.addEventListener("change", renderTable);
    prioritySelect.addEventListener("change", renderTable);

    renderAll();
  });
})(window.IQRAA);
