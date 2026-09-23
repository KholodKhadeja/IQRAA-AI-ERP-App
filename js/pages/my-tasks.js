/* My Tasks (screens.md §17): every task assigned to the currently
   authenticated team member, with search + status/priority filters and a
   "quick status update" select per row.

   2026-09-23 "Connect My Tasks to Airtable": this is the first screen
   wired to the corrected relationship architecture from the audit/fixes
   tasks — real records now come from js/services/tasks-api.js
   (GET /api/tasks/my on the backend, which resolves the authenticated
   session to a real Airtable Users record id and filters Tasks by the
   real Tasks.Assignee linked-record field — see backend/server.js) instead
   of js/data/mock-data.js's data.tasks. A fresh fetch runs on every page
   load — see loadTasks() below — nothing is cached client-side across
   loads, same pattern already established by projects.js/leads.js/etc.

   Tasks.Status is a real Airtable select with exactly 5 options that
   happen to line up 1:1 with this page's existing STATUS_KEYS (Not
   Started/In Progress/Waiting/Review/Completed), so the existing Hebrew
   taskStatus.* labels and the quick-status <select> keep working
   unchanged — STATUS_LABEL_TO_KEY below just maps Airtable's raw English
   option label back to this page's internal key. Tasks.Priority is plain
   free text on the real table (not a constrained select) — unlike
   Status, there's no guaranteed 1:1 mapping to this page's low/medium/high
   filter, so a priority that doesn't match one of those three keys is
   still shown (as its raw text) rather than dropped or crashing. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  ns.workspaceAuthReady.then(function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.tasksApi;
    if (!ph || !api) return;

    var STATUS_KEYS = ["notStarted", "inProgress", "waiting", "review", "completed"];
    var PRIORITY_KEYS = ["low", "medium", "high"];
    var STATUS_LABEL_TO_KEY = {
      "Not Started": "notStarted",
      "In Progress": "inProgress",
      "Waiting": "waiting",
      "Review": "review",
      "Completed": "completed"
    };

    var searchInput = document.getElementById("my-tasks-search");
    var statusSelect = document.getElementById("my-tasks-filter-status");
    var prioritySelect = document.getElementById("my-tasks-filter-priority");

    var tasks = [];

    function renderLoading() {
      document.getElementById("my-tasks-list-body").innerHTML =
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
        ns.i18n.t("myTasks.loading") +
        "</p>";
    }

    function renderError() {
      document.getElementById("my-tasks-list-body").innerHTML =
        '<div class="panel__empty">' +
        "<p>" + ns.i18n.t("myTasks.loadError") + "</p>" +
        '<button type="button" class="btn btn--secondary" id="my-tasks-retry-btn">' + ns.i18n.t("myTasks.retry") + "</button>" +
        "</div>";
      var retryBtn = document.getElementById("my-tasks-retry-btn");
      if (retryBtn) retryBtn.addEventListener("click", loadTasks);
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
      if (query && (task.title || "").toLowerCase().indexOf(query) === -1) return false;
      if (statusSelect.value !== "" && task.statusKey !== statusSelect.value) return false;
      if (prioritySelect.value !== "" && task.priorityKey !== prioritySelect.value) return false;
      return true;
    }

    function renderPriorityCell(task) {
      if (task.priorityKey) return ph.priorityBadge(task.priorityKey);
      return task.priority ? task.priority : "";
    }

    function renderTable() {
      var host = document.getElementById("my-tasks-list-body");
      var filtered = tasks.filter(matchesFilters);
      if (filtered.length === 0) {
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
      var rows = filtered
        .map(function (task) {
          var overdue = task.statusKey !== "completed" && ph.isOverdue(task.dueDate);
          var dueLabel = ph.formatDate(task.dueDate) + (overdue ? ns.i18n.t("projectWorkspace.taskOverdueSuffix") : "");
          var projectCell = task.projectId
            ? '<a class="data-table__primary" href="' + ph.projectLink(task.projectId) + '">' + (task.projectName || "") + "</a>"
            : (task.projectName || "");
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("taskFields.title") + '">' + (task.title || "") + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.project") + '">' + projectCell + "</td>" +
            '<td data-label="' + ns.i18n.t("taskFields.priority") + '">' + renderPriorityCell(task) + "</td>" +
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
        var task = filtered.filter(function (t) {
          return t.id === select.getAttribute("data-task-status");
        })[0];
        if (task && task.statusKey) select.value = task.statusKey;
        select.addEventListener("change", function () {
          /* Local-only, same known simplification as team.html's
             pause/reactivate toggle (CLAUDE.md §19d) — there's no
             PATCH /api/tasks/:id endpoint yet, so this updates the
             fetched-in-memory row for this page view only and does not
             write back to Airtable. */
          if (task) task.statusKey = select.value;
        });
      });
    }

    function normalizeTask(t) {
      var priorityKey = (t.priority || "").trim().toLowerCase();
      if (PRIORITY_KEYS.indexOf(priorityKey) === -1) priorityKey = null;
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        priorityKey: priorityKey,
        statusKey: STATUS_LABEL_TO_KEY[t.status] || null,
        dueDate: t.dueDate,
        projectId: t.projectId,
        projectName: t.projectName
      };
    }

    function loadTasks() {
      renderLoading();
      api
        .getMyTasks()
        .then(function (fetchedTasks) {
          tasks = fetchedTasks.map(normalizeTask);
          populateFilters();
          renderTable();
        })
        .catch(function (err) {
          console.error("[my-tasks] Failed to load tasks from the backend:", err);
          renderError();
        });
    }

    searchInput.addEventListener("input", renderTable);
    statusSelect.addEventListener("change", renderTable);
    prioritySelect.addEventListener("change", renderTable);

    loadTasks();
  });
})(window.IQRAA);
