/* Project Workspace detail (screens.md §10, §12 Tasks, §13 Meetings &
   Decisions, §16 Project History).

   2026-09-21k "Connect Projects to Airtable": the project itself (header
   facts — client/status/stage/progress/expected completion) now comes
   from js/services/projects-api.js (GET /api/projects on the existing
   backend), fetched fresh on every page load, same as js/pages/
   projects.js. Tasks, Team, Meetings & Decisions and History below the
   header are deliberately UNCHANGED and still read js/data/mock-data.js's
   data.tasks/data.meetings/data.recentActivity, filtered by
   `t.projectId === project.id` — connecting those tables is explicitly a
   separate, later task. Since no mock task/meeting references a real
   Airtable project id, those sections correctly render their existing
   empty states for every real project (not a bug — there's genuinely no
   task/meeting data to show yet, and inventing any would violate the "no
   fake data" rule this was built under).

   Known scope limits (see js/pages/projects.js's file-header comment for
   the matching Projects List ones): "Project Manager" always shows
   "Unassigned" (no reliable name available from the Projects table alone
   — see backend/server.js), and the PM/Team-Member "is this project
   actually assigned to you" restriction check from the mock-data version
   is skipped entirely for real projects (same reason — no pmId/teamIds
   to check against yet). Re-introduce both once a future task joins
   Project Manager/team assignment to real user records. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  ns.workspaceAuthReady.then(function () {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    var api = ns.services.projectsApi;
    var host = document.getElementById("project-workspace-content");
    if (!data || !ph || !api || !host) return;

    function setHeaderTitle(text) {
      var titleEl = document.querySelector(".workspace-header__title");
      if (titleEl) titleEl.textContent = text;
    }

    function renderLoading() {
      host.innerHTML =
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
        ns.i18n.t("projects.loading") +
        "</p>";
    }

    function renderError(onRetry) {
      host.innerHTML =
        '<div class="panel__empty">' +
        "<p>" + ns.i18n.t("projects.loadError") + "</p>" +
        '<button type="button" class="btn btn--secondary" id="project-workspace-retry-btn">' + ns.i18n.t("projects.retry") + "</button>" +
        "</div>";
      var retryBtn = document.getElementById("project-workspace-retry-btn");
      if (retryBtn) retryBtn.addEventListener("click", onRetry);
    }

    function renderNotFound() {
      setHeaderTitle(ns.i18n.t("projectWorkspace.notFoundHeading"));
      host.innerHTML =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.notFoundHeading") + "</h2>" +
        '<p class="panel__empty">' + ns.i18n.t("projectWorkspace.notFoundText") + "</p>" +
        "</section>";
    }

    function renderPipeline(project) {
      var stepperProject = { stageKey: ph.airtableStageKey(project.stage) };
      return (
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.pipelineHeading") + "</h2>" +
        ph.pipelineStepperHtml(stepperProject) +
        '<p class="pipeline-stepper__note">' + ns.i18n.t("pipeline.changesNote") + "</p>" +
        "</section>"
      );
    }

    function renderTeam(project) {
      if (!project.teamIds || project.teamIds.length === 0) {
        return '<p class="panel__empty">' + ns.i18n.t("projectWorkspace.noTeamAssigned") + "</p>";
      }
      return (
        '<div class="project-workspace__team-list">' +
        project.teamIds
          .map(function (memberId) {
            var member = data.teamMembers.filter(function (m) {
              return m.id === memberId;
            })[0];
            if (!member) return "";
            var initial = member.name.charAt(0).toUpperCase();
            return (
              '<div class="project-workspace__team-member">' +
              '<span class="avatar" aria-hidden="true">' + initial + "</span>" +
              '<span class="project-workspace__team-member-info">' +
              '<span class="project-workspace__team-member-name">' + member.name + "</span>" +
              '<span class="project-workspace__team-member-role">' + ns.i18n.t(member.roleKey) + "</span>" +
              "</span>" +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    function renderResources() {
      return (
        "<div>" +
        data.resourceTemplates
          .map(function (resource) {
            return (
              '<div class="list-row">' +
              '<span class="list-row__icon" aria-hidden="true">' + ns.icons[resource.icon](16) + "</span>" +
              '<span class="list-row__title">' + ns.i18n.t(resource.titleKey) + "</span>" +
              '<span class="badge badge--neutral">' + ns.i18n.t("projectWorkspace.resourceDemoLabel") + "</span>" +
              "</div>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    function openTaskModal(task) {
      var body =
        ph.fieldRow("taskFields.description", task.description || "—") +
        ph.fieldRow("taskFields.assignee", ph.teamMemberName(task.assigneeId)) +
        ph.fieldRow("projectFields.status", ph.taskStatusBadge(task.status)) +
        ph.fieldRow("taskFields.priority", ph.priorityBadge(task.priority)) +
        ph.fieldRow("projectFields.deadline", ph.formatDate(task.dueDate)) +
        '<p class="note-text">' + ns.i18n.t("projectWorkspace.taskCommentsComingSoon") + "</p>";
      ns.components.modal.open(task.title, body);
    }

    function renderProject(project) {
      setHeaderTitle(project.name || ns.i18n.t("projectWorkspace.notFoundHeading"));

      var headerHtml =
        '<section class="panel project-workspace__header">' +
        ph.fieldRow("projectFields.client", project.client || ns.i18n.t("projectFields.unassigned")) +
        ph.fieldRow("projectFields.status", ph.airtableStatusBadge(project.status)) +
        ph.fieldRow("projectFields.stage", ph.airtableStageLabel(project.stage)) +
        ph.fieldRow(
          "projectFields.progress",
          '<span class="project-workspace__header-progress progress-bar"><span class="progress-bar__fill" style="width:' +
            (project.progress || 0) +
            '%"></span></span>'
        ) +
        ph.fieldRow("projectWorkspace.expectedCompletion", ph.formatDate(project.expectedCompletion)) +
        ph.fieldRow("projectFields.pm", ns.i18n.t("projectFields.unassigned")) +
        "</section>";

      var overviewHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.overviewHeading") + "</h2>" +
        '<p class="project-workspace__summary">' + (project.summary || "") + "</p>" +
        "</section>";

      var tasksHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.tasksHeading") + "</h2>" +
        '<div class="task-board" id="project-task-board"></div>' +
        "</section>";

      var meetingsHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.meetingsHeading") + "</h2>" +
        '<div id="project-meetings-list"></div>' +
        "</section>";

      var historyHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.historyHeading") + "</h2>" +
        '<div id="project-history-list"></div>' +
        "</section>";

      var teamHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.teamHeading") + "</h2>" +
        renderTeam(project) +
        "</section>";

      var resourcesHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.resourcesHeading") + "</h2>" +
        '<p class="note-text">' + ns.i18n.t("projectWorkspace.resourcesComingSoon") + "</p>" +
        renderResources() +
        "</section>";

      host.innerHTML =
        headerHtml +
        '<div class="project-workspace__grid">' +
        '<div class="project-workspace__main">' +
        overviewHtml +
        tasksHtml +
        renderPipeline(project) +
        meetingsHtml +
        historyHtml +
        "</div>" +
        '<div class="project-workspace__side">' + teamHtml + resourcesHtml + "</div>" +
        "</div>";

      var projectTasks = data.tasks.filter(function (t) {
        return t.projectId === project.id;
      });
      ph.renderTaskBoard("project-task-board", projectTasks, openTaskModal);

      var projectMeetings = data.meetings.filter(function (m) {
        return m.projectId === project.id;
      });
      ph.renderMeetingsList("project-meetings-list", projectMeetings);

      var projectActivity = data.recentActivity.filter(function (a) {
        return a.projectId === project.id;
      });
      ph.renderActivityList("project-history-list", projectActivity);
    }

    function loadAndRender() {
      var id = window.IQRAA_CURRENT_PROJECT_ID;
      if (!id) {
        renderNotFound();
        return;
      }
      renderLoading();
      api
        .getProjects()
        .then(function (projects) {
          var project = projects.filter(function (p) {
            return p.id === id;
          })[0];
          if (!project) {
            renderNotFound();
            return;
          }
          renderProject(project);
        })
        .catch(function (err) {
          console.error("[project-workspace] Failed to load project from the backend:", err);
          renderError(loadAndRender);
        });
    }

    loadAndRender();
  });
})(window.IQRAA);
