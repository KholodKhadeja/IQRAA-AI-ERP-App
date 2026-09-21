/* Client Project View (screens.md §23) — the client-safe counterpart to
   Project Workspace.

   2026-09-22b "Connect Clients to Airtable": this now fetches real data
   from js/services/clients-api.js's getMyClientProjects()
   (GET /api/clients/me), fresh on every page load. That endpoint is the
   security boundary this task required: it derives the caller's
   authorized project(s) purely from the AUTHENTICATED SESSION's email
   matched against the Clients table server-side — it never accepts a
   client- or project-id from this page as input. currentProject() below
   only ever picks among the projects THAT ENDPOINT ALREADY RETURNED, via
   the `?id=` URL param — there is no code path that can make the backend
   fetch a project outside the caller's own authorized set, so changing
   ?id= in the URL can at most switch between the client's own projects,
   never reach another client's.

   Deliberately NOT reused from the old mock version: Approve / Request
   Changes and the feedback form used to mutate js/data/mock-data.js's
   data.projects/data.clientFeedback in place. There is no Airtable field
   or table backing approvals or feedback for a project, so continuing to
   silently mutate an in-memory array now that the PROJECT data itself is
   real would be actively misleading (CLAUDE.md §18's external-
   integration-placeholder convention) — both actions now show a "not
   connected yet" note instead. The approval panel itself still appears
   when the project's real stage is one that needs client action (stage
   transparency is real, informative data), only the buttons are inert. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.clientsApi;
    var host = document.getElementById("client-project-content");
    if (!ph || !api || !host) return;

    var myProjects = [];

    function setHeaderTitle(text) {
      var titleEl = document.querySelector(".workspace-header__title");
      if (titleEl) titleEl.textContent = text;
    }

    function renderLoading() {
      setHeaderTitle(ns.i18n.t("clientProject.loading"));
      host.innerHTML =
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
        ns.i18n.t("clientProject.loading") +
        "</p>";
    }

    function renderErrorState() {
      host.innerHTML =
        '<div class="panel__empty">' +
        "<p>" + ns.i18n.t("clientProject.loadError") + "</p>" +
        '<button type="button" class="btn btn--secondary" id="client-project-retry-btn">' + ns.i18n.t("clientProject.retry") + "</button>" +
        "</div>";
      var retryBtn = document.getElementById("client-project-retry-btn");
      if (retryBtn) retryBtn.addEventListener("click", loadAndRender);
    }

    function renderNoProjects() {
      setHeaderTitle(ns.i18n.t("clientProject.noProjectsHeading"));
      host.innerHTML =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("clientProject.noProjectsHeading") + "</h2>" +
        '<p class="panel__empty">' + ns.i18n.t("clientProject.noProjectsText") + "</p>" +
        "</section>";
    }

    function currentProject() {
      var params = new URLSearchParams(window.location.search);
      var requestedId = params.get("id");
      if (requestedId) {
        return myProjects.filter(function (p) {
          return p.id === requestedId;
        })[0] || null;
      }
      return myProjects.length > 0 ? myProjects[0] : null;
    }

    function needsClientAction(project) {
      var key = ph.airtableStageKey(project.stage);
      return ["clientScriptApproval", "clientReview", "clientApproval"].indexOf(key) !== -1;
    }

    function renderApproval(project) {
      if (!needsClientAction(project)) return "";
      return (
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("clientProject.approvalHeading") + "</h2>" +
        '<p class="project-workspace__summary">' + ns.i18n.t("clientProject.approvalText") + "</p>" +
        '<div class="modal__actions modal__actions--start">' +
        '<button type="button" class="btn btn--primary" id="client-approve-btn">' + ns.i18n.t("clientProject.approveAction") + "</button>" +
        '<button type="button" class="btn btn--secondary" id="client-changes-btn">' + ns.i18n.t("clientProject.requestChangesAction") + "</button>" +
        "</div>" +
        '<p class="note-text">' + ns.i18n.t("clientProject.writeNotConnected") + "</p>" +
        "</section>"
      );
    }

    function renderFeedback() {
      return (
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("clientProject.feedbackHeading") + "</h2>" +
        '<p class="panel__empty">' + ns.i18n.t("clientProject.feedbackEmpty") + "</p>" +
        '<form id="client-feedback-form">' +
        '<label class="sr-only" for="client-feedback-text" data-i18n="clientProject.feedbackPlaceholder"></label>' +
        '<textarea id="client-feedback-text" class="text-field__input" rows="3" placeholder="' +
        ns.i18n.t("clientProject.feedbackPlaceholder") + '"></textarea>' +
        '<div class="modal__actions modal__actions--start">' +
        '<button type="submit" class="btn btn--secondary">' + ns.i18n.t("clientProject.feedbackSubmit") + "</button>" +
        "</div>" +
        '<p class="note-text">' + ns.i18n.t("clientProject.writeNotConnected") + "</p>" +
        "</form>" +
        "</section>"
      );
    }

    function renderResources() {
      return (
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.resourcesHeading") + "</h2>" +
        '<p class="note-text">' + ns.i18n.t("projectWorkspace.resourcesComingSoon") + "</p>" +
        "<div>" +
        ns.data.resourceTemplates
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

    function renderContactPm() {
      return (
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("clientProject.contactPmHeading") + "</h2>" +
        ph.fieldRow("projectFields.pm", ns.i18n.t("projectFields.unassigned")) +
        "</section>"
      );
    }

    function wirePlaceholderNote() {
      var approveBtn = document.getElementById("client-approve-btn");
      var changesBtn = document.getElementById("client-changes-btn");
      var feedbackForm = document.getElementById("client-feedback-form");
      [approveBtn, changesBtn].forEach(function (btn) {
        if (btn) btn.addEventListener("click", function () {
          btn.disabled = true;
        });
      });
      if (feedbackForm) {
        feedbackForm.addEventListener("submit", function (event) {
          event.preventDefault();
        });
      }
    }

    function renderProject(project) {
      setHeaderTitle(project.name || ns.i18n.t("clientProject.noProjectsHeading"));

      var headerHtml =
        '<section class="panel project-workspace__header">' +
        ph.fieldRow("projectFields.status", ph.airtableStatusBadge(project.status)) +
        ph.fieldRow("projectFields.stage", ph.airtableStageLabel(project.stage)) +
        ph.fieldRow(
          "projectFields.progress",
          '<span class="project-workspace__header-progress progress-bar"><span class="progress-bar__fill" style="width:' +
            (project.progress || 0) +
            '%"></span></span>'
        ) +
        ph.fieldRow("projectWorkspace.expectedCompletion", ph.formatDate(project.expectedCompletion)) +
        "</section>";

      var overviewHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.overviewHeading") + "</h2>" +
        '<p class="project-workspace__summary">' + (project.summary || "") + "</p>" +
        "</section>";

      var pipelineHtml =
        '<section class="panel">' +
        '<h2 class="panel__title">' + ns.i18n.t("projectWorkspace.pipelineHeading") + "</h2>" +
        ph.pipelineStepperHtml({ stageKey: ph.airtableStageKey(project.stage) }) +
        "</section>";

      host.innerHTML =
        headerHtml +
        '<div class="project-workspace__grid">' +
        '<div class="project-workspace__main">' +
        overviewHtml +
        renderApproval(project) +
        pipelineHtml +
        renderFeedback() +
        "</div>" +
        '<div class="project-workspace__side">' + renderContactPm() + renderResources() + "</div>" +
        "</div>";

      wirePlaceholderNote();
    }

    function loadAndRender() {
      renderLoading();
      api
        .getMyClientProjects()
        .then(function (result) {
          myProjects = result.projects || [];
          var project = currentProject();
          if (!project) {
            renderNoProjects();
            return;
          }
          renderProject(project);
        })
        .catch(function (err) {
          /* A 403 here means this session isn't linked to any Clients
             record — treated the same as "no projects" rather than a
             distinct error, so it never hints at what a different
             account might see. */
          if (err && err.status === 403) {
            renderNoProjects();
            return;
          }
          console.error("[client-project] Failed to load client/project data from the backend:", err);
          renderErrorState();
        });
    }

    loadAndRender();
  });
})(window.IQRAA);
