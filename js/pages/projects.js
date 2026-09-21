/* Projects List (screens.md §9). This page is reachable by Admin, PM and
   Team Member (all three sidebars link here), so it doesn't hardcode
   window.IQRAA_ROLE the way single-role pages do — it awaits
   ns.workspaceAuthReady (js/workspace-chrome.js), which resolves with
   the real, backend-verified session once access to this page has been
   confirmed (2026-09-21h "Login authentication flow"). Admin sees every
   project; a PM sees only projects assigned to the demo-logged-in PM, a
   Team Member only projects they're on the team of (data.currentPmId /
   data.currentTeamMemberId — CLAUDE.md §9/§5 on why there's a fixed demo
   identity instead of a real one for the underlying project data, which
   is still mock). Client's own "Projects" nav item is a separate, still-
   disabled step (screens.md §38 Step 11), not this page. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  ns.workspaceAuthReady.then(function (session) {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    if (!data || !ph) return;

    var searchInput = document.getElementById("projects-search");
    var stageSelect = document.getElementById("projects-filter-stage");
    var statusSelect = document.getElementById("projects-filter-status");
    var STATUS_KEYS = ["onTrack", "attention", "overdue", "readyToStart"];

    var role = session.user.role;
    var baseProjects = data.projects;
    if (role === "pm") baseProjects = ph.projectsForPm(data.currentPmId);
    else if (role === "teamMember") baseProjects = ph.projectsForTeamMember(data.currentTeamMemberId);

    function populateFilters() {
      var previousStage = stageSelect.value;
      var previousStatus = statusSelect.value;

      var stageOptions = data.pipelineStages
        .map(function (stage, index) {
          return '<option value="' + index + '">' + ns.i18n.t(stage.labelKey) + "</option>";
        })
        .join("");
      stageSelect.innerHTML = '<option value="">' + ns.i18n.t("projects.allStages") + "</option>" + stageOptions;

      var statusOptions = STATUS_KEYS.map(function (status) {
        return '<option value="' + status + '">' + ns.i18n.t("status." + status) + "</option>";
      }).join("");
      statusSelect.innerHTML = '<option value="">' + ns.i18n.t("projects.allStatuses") + "</option>" + statusOptions;

      stageSelect.value = previousStage;
      statusSelect.value = previousStatus;
    }

    function matchesFilters(project) {
      var query = searchInput.value.trim().toLowerCase();
      if (query && project.name.toLowerCase().indexOf(query) === -1 && ph.clientName(project.clientId).toLowerCase().indexOf(query) === -1) {
        return false;
      }
      if (stageSelect.value !== "" && String(ph.stageIndex(project.stageKey)) !== stageSelect.value) {
        return false;
      }
      if (statusSelect.value !== "" && project.status !== statusSelect.value) {
        return false;
      }
      return true;
    }

    function renderTable() {
      var projects = baseProjects.filter(matchesFilters);
      ph.renderProjectsTable("projects-list-body", projects, "projects.emptyResults");
    }

    function renderAll() {
      populateFilters();
      renderTable();
    }

    searchInput.addEventListener("input", renderTable);
    stageSelect.addEventListener("change", renderTable);
    statusSelect.addEventListener("change", renderTable);

    renderAll();
  });
})(window.IQRAA);
