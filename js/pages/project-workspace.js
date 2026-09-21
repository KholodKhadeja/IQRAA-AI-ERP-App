/* Project Workspace detail (screens.md §10, §12 Tasks, §13 Meetings &
   Decisions, §16 Project History). window.IQRAA_CURRENT_PROJECT_ID is
   resolved by a small inline script in project-workspace.html before this
   file runs, so the workspace-header's <h1> can show the real project
   name (see workspace-header.js's titleText param) instead of a
   translation key. Role scoping: a PM or Team Member reaching this page
   (via their own Projects List) can only open a project actually assigned
   to them — the real session role (from ns.workspaceAuthReady, see
   js/workspace-chrome.js — 2026-09-21h) + data.currentPmId/
   currentTeamMemberId enforce that here, not just by hiding the link
   elsewhere (CLAUDE.md §4). */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  ns.workspaceAuthReady.then(function (session) {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    var host = document.getElementById("project-workspace-content");
    if (!data || !ph || !host) return;

    function renderNotFound() {
      host.innerHTML =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.notFoundHeading") + "</h2>" +
        '<p class="panel__empty">' + ns.i18n.t("projectWorkspace.notFoundText") + "</p>" +
        "</section>";
    }

    function renderRestricted() {
      host.innerHTML =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.restrictedHeading") + "</h2>" +
        '<p class="panel__empty">' + ns.i18n.t("projectWorkspace.restrictedText") + "</p>" +
        "</section>";
    }

    function renderPipeline(project) {
      return (
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.pipelineHeading") + "</h2>" +
        ph.pipelineStepperHtml(project) +
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
      var headerHtml =
        '<section class="panel project-workspace__header">' +
        ph.fieldRow("projectFields.client", ph.clientName(project.clientId)) +
        ph.fieldRow("projectFields.status", ph.statusBadge(project.status)) +
        ph.fieldRow("projectFields.stage", ph.stageLabel(project.stageKey)) +
        ph.fieldRow(
          "projectFields.progress",
          '<span class="project-workspace__header-progress progress-bar"><span class="progress-bar__fill" style="width:' +
            project.progress +
            '%"></span></span>'
        ) +
        ph.fieldRow("projectWorkspace.expectedCompletion", ph.formatDate(project.deadline)) +
        ph.fieldRow("projectFields.pm", ph.pmName(project.pmId)) +
        "</section>";

      var overviewHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.overviewHeading") + "</h2>" +
        '<p class="project-workspace__summary">' + project.summary + "</p>" +
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

    function renderAll() {
      var id = window.IQRAA_CURRENT_PROJECT_ID;
      var project = id ? ph.getProject(id) : null;
      if (!project) {
        renderNotFound();
        return;
      }
      var role = session.user.role;
      if (role === "pm" && project.pmId !== data.currentPmId) {
        renderRestricted();
        return;
      }
      if (role === "teamMember" && (!project.teamIds || project.teamIds.indexOf(data.currentTeamMemberId) === -1)) {
        renderRestricted();
        return;
      }
      renderProject(project);
    }

    renderAll();
  });
})(window.IQRAA);
