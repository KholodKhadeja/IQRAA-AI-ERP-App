/* Client Project View (screens.md §23) — the client-safe counterpart to
   Project Workspace. Deliberately does NOT reuse project-workspace.js's
   render: no task board, no team roster, no internal history — only what
   CLAUDE.md §4 says a client may see (progress, stage, expected
   completion, resources, feedback/approval, contact PM). Reuses
   ph.pipelineStepperHtml() so the client sees the exact same stage
   stepper as the internal view (stage transparency is explicitly wanted;
   internal staffing/task detail is not). Approve / Request Changes
   mutate the shared data.projects record in place — the same real
   in-memory-mutation pattern used everywhere else in this build — and
   also append a data.recentActivity entry, so an approval here shows up
   in Admin Overview's/Project History's activity feed too. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    var host = document.getElementById("client-project-content");
    if (!data || !ph || !host) return;

    function currentProjectId() {
      var params = new URLSearchParams(window.location.search);
      var requestedId = params.get("id");
      var myProjects = ph.projectsForClient(data.currentClientId);
      if (requestedId) {
        var match = myProjects.filter(function (p) {
          return p.id === requestedId;
        })[0];
        return match ? match.id : null;
      }
      return myProjects.length > 0 ? myProjects[0].id : null;
    }

    function renderNoProjects() {
      host.innerHTML =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("clientProject.noProjectsHeading") + "</h2>" +
        '<p class="panel__empty">' + ns.i18n.t("clientProject.noProjectsText") + "</p>" +
        "</section>";
    }

    function renderApproval(project) {
      if (!ph.needsClientAction(project)) return "";
      return (
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("clientProject.approvalHeading") + "</h2>" +
        '<p class="project-workspace__summary">' + ns.i18n.t("clientProject.approvalText") + "</p>" +
        '<div class="modal__actions modal__actions--start">' +
        '<button type="button" class="btn btn--primary" id="client-approve-btn">' + ns.i18n.t("clientProject.approveAction") + "</button>" +
        '<button type="button" class="btn btn--secondary" id="client-changes-btn">' + ns.i18n.t("clientProject.requestChangesAction") + "</button>" +
        "</div>" +
        "</section>"
      );
    }

    function renderFeedback(project) {
      var entries = data.clientFeedback.filter(function (f) {
        return f.projectId === project.id;
      });
      var listHtml = entries.length
        ? entries
            .map(function (f) {
              return '<p class="project-workspace__summary">' + ph.formatDateTime(f.when) + " — " + f.text + "</p>";
            })
            .join("")
        : '<p class="panel__empty">' + ns.i18n.t("clientProject.feedbackEmpty") + "</p>";
      return (
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("clientProject.feedbackHeading") + "</h2>" +
        '<div id="client-feedback-list">' + listHtml + "</div>" +
        '<form id="client-feedback-form">' +
        '<label class="sr-only" for="client-feedback-text" data-i18n="clientProject.feedbackPlaceholder"></label>' +
        '<textarea id="client-feedback-text" class="text-field__input" rows="3" placeholder="' +
        ns.i18n.t("clientProject.feedbackPlaceholder") + '"></textarea>' +
        '<div class="modal__actions modal__actions--start">' +
        '<button type="submit" class="btn btn--secondary">' + ns.i18n.t("clientProject.feedbackSubmit") + "</button>" +
        "</div>" +
        "</form>" +
        '<p class="note-text" id="client-feedback-thanks" hidden>' + ns.i18n.t("clientProject.feedbackThanks") + "</p>" +
        "</section>"
      );
    }

    function renderResources() {
      return (
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.resourcesHeading") + "</h2>" +
        '<p class="note-text">' + ns.i18n.t("projectWorkspace.resourcesComingSoon") + "</p>" +
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
        "</div>" +
        "</section>"
      );
    }

    function renderContactPm(project) {
      var email = ph.pmEmail(project.pmId);
      return (
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("clientProject.contactPmHeading") + "</h2>" +
        ph.fieldRow("projectFields.pm", ph.pmName(project.pmId)) +
        (email
          ? '<a class="btn btn--secondary" href="mailto:' + email + '">' + ns.i18n.t("clientProject.contactPmEmailAction") + "</a>"
          : "") +
        "</section>"
      );
    }

    function wireApproval(project) {
      var approveBtn = document.getElementById("client-approve-btn");
      var changesBtn = document.getElementById("client-changes-btn");
      if (approveBtn) {
        approveBtn.addEventListener("click", function () {
          var nextIndex = ph.stageIndex(project.stageKey) + 1;
          if (nextIndex < data.pipelineStages.length) {
            project.stageKey = data.pipelineStages[nextIndex].key;
          }
          data.recentActivity.unshift({
            icon: "check",
            textKey: "activity.deliverableApproved",
            projectId: project.id,
            when: new Date().toISOString()
          });
          renderAll();
        });
      }
      if (changesBtn) {
        changesBtn.addEventListener("click", function () {
          project.stageKey = "changes";
          renderAll();
        });
      }
    }

    function wireFeedback(project) {
      var form = document.getElementById("client-feedback-form");
      if (!form) return;
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var textarea = document.getElementById("client-feedback-text");
        if (!textarea.value.trim()) return;
        data.clientFeedback.push({ projectId: project.id, text: textarea.value.trim(), when: new Date().toISOString() });
        document.getElementById("client-feedback-thanks").hidden = false;
        renderAll();
      });
    }

    function renderProject(project) {
      var headerHtml =
        '<section class="panel project-workspace__header">' +
        ph.fieldRow("projectFields.status", ph.statusBadge(project.status)) +
        ph.fieldRow("projectFields.stage", ph.stageLabel(project.stageKey)) +
        ph.fieldRow(
          "projectFields.progress",
          '<span class="project-workspace__header-progress progress-bar"><span class="progress-bar__fill" style="width:' +
            project.progress +
            '%"></span></span>'
        ) +
        ph.fieldRow("projectWorkspace.expectedCompletion", ph.formatDate(project.deadline)) +
        "</section>";

      var overviewHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.overviewHeading") + "</h2>" +
        '<p class="project-workspace__summary">' + project.summary + "</p>" +
        "</section>";

      var pipelineHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.pipelineHeading") + "</h2>" +
        ph.pipelineStepperHtml(project) +
        "</section>";

      host.innerHTML =
        headerHtml +
        '<div class="project-workspace__grid">' +
        '<div class="project-workspace__main">' +
        overviewHtml +
        renderApproval(project) +
        pipelineHtml +
        renderFeedback(project) +
        "</div>" +
        '<div class="project-workspace__side">' + renderContactPm(project) + renderResources() + "</div>" +
        "</div>";

      wireApproval(project);
      wireFeedback(project);
    }

    function renderAll() {
      var id = currentProjectId();
      var project = id ? ph.getProject(id) : null;
      if (!project) {
        renderNoProjects();
        return;
      }
      renderProject(project);
    }

    renderAll();
    ns.i18n.onLanguageChange(renderAll);
  });
})(window.IQRAA);
