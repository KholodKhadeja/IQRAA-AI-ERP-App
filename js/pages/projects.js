/* Projects List (screens.md §9). This page is reachable by Admin, PM and
   Team Member (all three sidebars link here).

   2026-09-21k "Connect Projects to Airtable": this list now renders real
   records from js/services/projects-api.js (GET /api/projects on the
   existing backend, which reads the Airtable Projects table) instead of
   js/data/mock-data.js's data.projects. A fresh fetch runs every time this
   page loads — see loadProjects() below — so editing/adding/removing a
   project directly in Airtable and reloading this page reflects the
   change, nothing is cached client-side across loads.

   Known scope limit (documented, not a bug): the previous mock-data
   version filtered this list per role (a PM saw only ph.projectsForPm(),
   a Team Member only ph.projectsForTeamMember()) using the mock demo
   identities data.currentPmId/currentTeamMemberId. Real Airtable projects
   don't carry a pmId/teamIds shaped to match those demo identities (see
   backend/server.js's Projects section for why "Project Manager" isn't
   resolved to a name at all yet), so there's no reliable way to scope
   this list per role yet — every role currently sees the same full real
   list. Re-introduce role scoping once a future task joins Project
   Manager/team assignment back to real user records. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  ns.workspaceAuthReady.then(function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.projectsApi;
    if (!ph || !api) return;

    var searchInput = document.getElementById("projects-search");
    var stageSelect = document.getElementById("projects-filter-stage");
    var statusSelect = document.getElementById("projects-filter-status");

    var allProjects = [];

    function renderLoading() {
      document.getElementById("projects-list-body").innerHTML =
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
        ns.i18n.t("projects.loading") +
        "</p>";
    }

    function renderError() {
      document.getElementById("projects-list-body").innerHTML =
        '<div class="panel__empty">' +
        "<p>" + ns.i18n.t("projects.loadError") + "</p>" +
        '<button type="button" class="btn btn--secondary" id="projects-retry-btn">' + ns.i18n.t("projects.retry") + "</button>" +
        "</div>";
      var retryBtn = document.getElementById("projects-retry-btn");
      if (retryBtn) retryBtn.addEventListener("click", loadProjects);
    }

    /* Filter dropdown options are built from whatever real stage/status
       values are actually present in the fetched projects, rather than
       the mock system's fixed STATUS_KEYS/data.pipelineStages lists (§9's
       comment above explains why those don't apply to real records). */
    function populateFilters() {
      var previousStage = stageSelect.value;
      var previousStatus = statusSelect.value;

      var stageValues = [];
      var statusValues = [];
      allProjects.forEach(function (p) {
        if (p.stage && stageValues.indexOf(p.stage) === -1) stageValues.push(p.stage);
        if (p.status && statusValues.indexOf(p.status) === -1) statusValues.push(p.status);
      });

      var stageOptions = stageValues
        .map(function (stageLabelText) {
          return '<option value="' + stageLabelText + '">' + ph.airtableStageLabel(stageLabelText) + "</option>";
        })
        .join("");
      stageSelect.innerHTML = '<option value="">' + ns.i18n.t("projects.allStages") + "</option>" + stageOptions;

      var statusOptions = statusValues
        .map(function (statusLabelText) {
          return '<option value="' + statusLabelText + '">' + statusLabelText + "</option>";
        })
        .join("");
      statusSelect.innerHTML = '<option value="">' + ns.i18n.t("projects.allStatuses") + "</option>" + statusOptions;

      stageSelect.value = previousStage;
      statusSelect.value = previousStatus;
    }

    function matchesFilters(project) {
      var query = searchInput.value.trim().toLowerCase();
      if (query) {
        var name = (project.name || "").toLowerCase();
        var client = (project.client || "").toLowerCase();
        if (name.indexOf(query) === -1 && client.indexOf(query) === -1) return false;
      }
      if (stageSelect.value !== "" && project.stage !== stageSelect.value) return false;
      if (statusSelect.value !== "" && project.status !== statusSelect.value) return false;
      return true;
    }

    function renderTable() {
      var filtered = allProjects.filter(matchesFilters);
      ph.renderRealProjectsTable("projects-list-body", filtered, "projects.emptyResults");
    }

    function loadProjects() {
      renderLoading();
      api
        .getProjects()
        .then(function (projects) {
          allProjects = projects;
          populateFilters();
          renderTable();
        })
        .catch(function (err) {
          console.error("[projects] Failed to load projects from the backend:", err);
          renderError();
        });
    }

    searchInput.addEventListener("input", renderTable);
    stageSelect.addEventListener("change", renderTable);
    statusSelect.addEventListener("change", renderTable);

    loadProjects();
  });
})(window.IQRAA);
