/* Project Workspace detail (screens.md §10, §12 Tasks, §13 Meetings &
   Decisions, §16 Project History).

   2026-09-21k "Connect Projects to Airtable": the project itself (header
   facts — client/status/stage/progress/expected completion) now comes
   from js/services/projects-api.js (GET /api/projects on the existing
   backend), fetched fresh on every page load, same as js/pages/
   projects.js.

   2026-09-25 "Connect Project Workspace Team & Tasks to real Airtable
   data": Tasks and Team now come from the same backend too — GET
   /api/projects/:id/tasks and GET /api/projects/:id/team (see
   backend/server.js), both reusing the existing Tasks table and its
   Project/Assignee links, no new table or field. Meetings & Decisions and
   History are explicitly UNCHANGED and still read js/data/mock-data.js's
   data.meetings/data.recentActivity, filtered by `m.projectId ===
   project.id` — out of scope for this task. Since no mock meeting/
   activity record references a real Airtable project id, those two
   sections correctly render their existing empty states for every real
   project.

   Known scope limit (see js/pages/projects.js's file-header comment for
   the matching Projects List one): the PM/Team-Member "is this project
   actually assigned to you" restriction check from the mock-data version
   is skipped for the header/overview itself (PM scoping is already
   enforced server-side by GET /api/projects; Team-Member project
   membership has no server-side check at that layer either) — but the new
   Tasks/Team endpoints below DO enforce it themselves (403 if this session
   isn't actually authorized for this project, see backend/server.js's
   isAuthorizedForProjectTasks()), so at least those two panels can't leak
   another project's internal data even if the header ever did.

   2026-09-24 "Assign PM from Project Workspace": the header's "Project
   Manager" fact now shows the real project.pmName (GET /api/projects
   already resolves this via a Users-table join — the field was simply
   never read here before, hardcoded to "Unassigned" instead) and, for an
   Admin session only, a small inline button next to it opens a modal to
   assign/reassign the PM via js/services/projects-api.js's
   getProjectManagers()/assignPm() (PATCH /api/projects/:id/assign-pm on
   the backend, a real Airtable write to the "Project Manager" linked-
   record field — see backend/server.js). PM/Team-Member/Client sessions
   never see the button at all, matching CLAUDE.md §10 (PM assignment is
   an Admin/CEO action). */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  ns.workspaceAuthReady.then(function (session) {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    var api = ns.services.projectsApi;
    var host = document.getElementById("project-workspace-content");
    if (!data || !ph || !api || !host) return;

    var role = session.user.role;

    /* Tasks.Status/Tasks.Priority come back from the backend as the real
       Airtable option text ("Not Started", "Medium", …) — same convention
       js/pages/my-tasks.js already established for the same table. These
       normalize them to the internal keys ph.renderTaskBoard/
       taskStatusBadge/priorityBadge expect; an unrecognized priority still
       displays (as raw text via task.priorityRaw in openTaskModal above)
       rather than being dropped. */
    var TASK_STATUS_LABEL_TO_KEY = {
      "Not Started": "notStarted",
      "In Progress": "inProgress",
      Waiting: "waiting",
      Review: "review",
      Completed: "completed"
    };
    var PRIORITY_KEYS = ["low", "medium", "high"];

    function normalizeProjectTask(t) {
      var priorityKey = (t.priority || "").trim().toLowerCase();
      if (PRIORITY_KEYS.indexOf(priorityKey) === -1) priorityKey = null;
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        status: TASK_STATUS_LABEL_TO_KEY[t.status] || null,
        priority: priorityKey,
        priorityRaw: t.priority,
        dueDate: t.dueDate,
        assigneeName: t.assigneeName
      };
    }

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

    function renderTeam(team) {
      if (!team || team.length === 0) {
        return '<p class="panel__empty">' + ns.i18n.t("projectWorkspace.noTeamAssigned") + "</p>";
      }
      return (
        '<div class="project-workspace__team-list">' +
        team
          .map(function (member) {
            if (!member.fullName) return "";
            var initial = member.fullName.charAt(0).toUpperCase();
            return (
              '<div class="project-workspace__team-member">' +
              '<span class="avatar" aria-hidden="true">' + initial + "</span>" +
              '<span class="project-workspace__team-member-info">' +
              '<span class="project-workspace__team-member-name">' + member.fullName + "</span>" +
              '<span class="project-workspace__team-member-role">' + (member.roleKey ? ns.i18n.t(member.roleKey) : "") + "</span>" +
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

    function pmFieldValueHtml(project) {
      var valueText = project.pmName || ns.i18n.t("projectFields.unassigned");
      if (role !== "admin") return valueText;
      return (
        valueText +
        '<button type="button" class="field-row__edit-btn" id="project-workspace-assign-pm-btn" aria-label="' +
        ns.i18n.t("adminOverview.assignPmLabel") +
        '">' +
        ns.icons.userPlus(14) +
        "</button>"
      );
    }

    function openAssignPmModal(project) {
      var currentPmId = (project.pmIds && project.pmIds[0]) || null;
      var body =
        '<form id="assign-pm-form" novalidate>' +
        '<div class="text-field"><label class="text-field__label" for="assign-pm-select">' +
        ns.i18n.t("adminOverview.assignPmLabel") +
        "</label>" +
        '<select id="assign-pm-select" class="select" disabled><option value="">' +
        ns.i18n.t("adminOverview.assignPmPlaceholder") +
        "</option></select></div>" +
        '<div class="modal__actions">' +
        '<button type="button" class="btn btn--secondary" id="assign-pm-cancel">' +
        ns.i18n.t("leads.cancelButton") +
        "</button>" +
        '<button type="submit" class="btn btn--primary" id="assign-pm-submit" disabled>' +
        ns.i18n.t("adminOverview.assignPmConfirm") +
        "</button>" +
        "</div>" +
        '<p class="note-text" id="assign-pm-error" role="alert" hidden></p>' +
        "</form>";
      ns.components.modal.open(ns.i18n.t("adminOverview.assignPmLabel"), body);

      var select = document.getElementById("assign-pm-select");
      var submitBtn = document.getElementById("assign-pm-submit");
      var errorEl = document.getElementById("assign-pm-error");
      var form = document.getElementById("assign-pm-form");

      document.getElementById("assign-pm-cancel").addEventListener("click", function () {
        ns.components.modal.close();
      });

      api
        .getProjectManagers()
        .then(function (pms) {
          if (!pms || pms.length === 0) {
            select.innerHTML = '<option value="">' + ns.i18n.t("projectWorkspace.assignPmNoOptions") + "</option>";
            return;
          }
          select.innerHTML = pms
            .map(function (pm) {
              var selectedAttr = pm.id === currentPmId ? " selected" : "";
              return '<option value="' + pm.id + '"' + selectedAttr + ">" + (pm.fullName || pm.id) + "</option>";
            })
            .join("");
          select.disabled = false;
          submitBtn.disabled = false;
        })
        .catch(function (err) {
          console.error("[project-workspace] Failed to load project managers:", err);
          select.innerHTML = '<option value="">' + ns.i18n.t("projectWorkspace.assignPmNoOptions") + "</option>";
        });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var pmId = select.value;
        if (!pmId) return;

        errorEl.hidden = true;
        submitBtn.disabled = true;
        var originalLabel = submitBtn.textContent;
        submitBtn.innerHTML =
          '<span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(14) + "</span> " + ns.i18n.t("projectWorkspace.assignPmSubmitting");

        api
          .assignPm(project.id, pmId)
          .then(function (updatedProject) {
            project.pmIds = (updatedProject && updatedProject.pmIds) || [pmId];
            project.pmName = updatedProject && updatedProject.pmName;
            ns.components.modal.close();
            renderProject(project);
          })
          .catch(function (err) {
            console.error("[project-workspace] Failed to assign PM:", err);
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
            errorEl.textContent = ns.i18n.t("projectWorkspace.assignPmError");
            errorEl.hidden = false;
          });
      });
    }

    function openTaskModal(task) {
      var body =
        ph.fieldRow("taskFields.description", task.description || "—") +
        ph.fieldRow("taskFields.assignee", task.assigneeName || ns.i18n.t("projectFields.unassigned")) +
        ph.fieldRow("projectFields.status", task.status ? ph.taskStatusBadge(task.status) : "—") +
        ph.fieldRow("taskFields.priority", task.priority ? ph.priorityBadge(task.priority) : task.priorityRaw || "—") +
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
        ph.fieldRow("projectFields.pm", pmFieldValueHtml(project)) +
        "</section>";

      var overviewHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.overviewHeading") + "</h2>" +
        '<p class="project-workspace__summary">' + (project.summary || "") + "</p>" +
        "</section>";

      var tasksHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.tasksHeading") + "</h2>" +
        '<div class="task-board" id="project-task-board">' +
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
        ns.i18n.t("projects.loading") +
        "</p></div>" +
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
        '<div id="project-team-list">' +
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
        ns.i18n.t("projects.loading") +
        "</p></div>" +
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

      api
        .getProjectTasks(project.id)
        .then(function (tasks) {
          ph.renderTaskBoard("project-task-board", tasks.map(normalizeProjectTask), openTaskModal);
        })
        .catch(function (err) {
          console.error("[project-workspace] Failed to load this project's tasks from the backend:", err);
          var taskBoard = document.getElementById("project-task-board");
          if (taskBoard) taskBoard.innerHTML = '<p class="panel__empty">' + ns.i18n.t("projects.loadError") + "</p>";
        });

      api
        .getProjectTeam(project.id)
        .then(function (team) {
          var teamList = document.getElementById("project-team-list");
          if (teamList) teamList.innerHTML = renderTeam(team);
        })
        .catch(function (err) {
          console.error("[project-workspace] Failed to load this project's team from the backend:", err);
          var teamList = document.getElementById("project-team-list");
          if (teamList) teamList.innerHTML = '<p class="panel__empty">' + ns.i18n.t("projects.loadError") + "</p>";
        });

      var projectMeetings = data.meetings.filter(function (m) {
        return m.projectId === project.id;
      });
      ph.renderMeetingsList("project-meetings-list", projectMeetings);

      var projectActivity = data.recentActivity.filter(function (a) {
        return a.projectId === project.id;
      });
      ph.renderActivityList("project-history-list", projectActivity);

      var assignPmBtn = document.getElementById("project-workspace-assign-pm-btn");
      if (assignPmBtn) {
        assignPmBtn.addEventListener("click", function () {
          openAssignPmModal(project);
        });
      }
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
