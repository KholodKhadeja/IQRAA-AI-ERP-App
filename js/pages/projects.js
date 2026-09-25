/* Projects List (screens.md §9). This page is reachable by Admin, PM and
   Team Member (all three sidebars link here).

   2026-09-21k "Connect Projects to Airtable": this list now renders real
   records from js/services/projects-api.js (GET /api/projects on the
   existing backend, which reads the Airtable Projects table) instead of
   js/data/mock-data.js's data.projects. A fresh fetch runs every time this
   page loads — see loadProjects() below — so editing/adding/removing a
   project directly in Airtable and reloading this page reflects the
   change, nothing is cached client-side across loads.

   Role scoping is enforced server-side now (2026-09-23 "Phase 1 security
   fix" — see backend/server.js's GET /api/projects comment): admin gets
   every project, pm/teamMember get their own real subset, client is
   rejected outright. "Project Manager" is resolved to a display name
   server-side too (2026-09-23 "Phase 3 data mapping fixes", p.pmName) by
   joining the real "Project Manager" linked-record ids against Users —
   see project-helpers.js's renderRealProjectsTable(). */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  ns.workspaceAuthReady.then(function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.projectsApi;
    if (!ph || !api) return;

    var searchInput = document.getElementById("projects-search");
    var statusSelect = document.getElementById("projects-filter-status");

    /* Real Airtable "Current Stage" label strings, in their actual
       pipeline order — same values/order as project-helpers.js's
       AIRTABLE_STAGE_LABEL_TO_KEY (2026-09-25 "Projects tabs + KPIs
       redesign": tabs replace the old stage <select>, so this list
       drives tab order; only stages actually present in the fetched
       projects get a tab, same principle populateFilters() already used
       for the dropdown it replaces). */
    var STAGE_ORDER = ["Specification", "Script", "Client Script Approval", "Design", "Production", "QA", "Client Review", "Changes", "Client Approval", "Publication"];
    var NO_STAGE_KEY = "no-stage";
    var activeTab = "all";

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

    /* Filter dropdown options are built from whatever real status values
       are actually present in the fetched projects, rather than the mock
       system's fixed STATUS_KEYS list (§9's comment above explains why
       that doesn't apply to real records). Stage is now the tabs' axis
       (renderTabs() below), not a second dropdown for the same field. */
    function populateFilters() {
      var previousStatus = statusSelect.value;

      var statusValues = [];
      allProjects.forEach(function (p) {
        if (p.status && statusValues.indexOf(p.status) === -1) statusValues.push(p.status);
      });

      var statusOptions = statusValues
        .map(function (statusLabelText) {
          return '<option value="' + statusLabelText + '">' + statusLabelText + "</option>";
        })
        .join("");
      statusSelect.innerHTML = '<option value="">' + ns.i18n.t("projects.allStatuses") + "</option>" + statusOptions;

      statusSelect.value = previousStatus;
    }

    function matchesFilters(project) {
      var query = searchInput.value.trim().toLowerCase();
      if (query) {
        var name = (project.name || "").toLowerCase();
        var client = (project.client || "").toLowerCase();
        if (name.indexOf(query) === -1 && client.indexOf(query) === -1) return false;
      }
      if (statusSelect.value !== "" && project.status !== statusSelect.value) return false;
      if (activeTab === NO_STAGE_KEY) {
        if (project.stage) return false;
      } else if (activeTab !== "all" && project.stage !== activeTab) {
        return false;
      }
      return true;
    }

    function renderTable() {
      var filtered = allProjects.filter(matchesFilters);
      ph.renderRealProjectsTable("projects-list-body", filtered, "projects.emptyResults");
    }

    /* KPI row + tabs (2026-09-25 "Projects tabs + KPIs redesign") — both
       computed from the full fetched set (not the current search/status
       filters), same convention as every other KPI row in the app. */
    function renderKpis() {
      var total = allProjects.length;
      var inProgress = 0;
      var readyToStart = 0;
      var completed = 0;
      allProjects.forEach(function (p) {
        if (p.status === "In Progress") inProgress++;
        else if (p.status === "Ready to Start") readyToStart++;
        else if (p.status === "Completed") completed++;
      });
      var items = [
        { icon: "folder", accent: "purple", value: total, label: ns.i18n.t("projects.kpiTotalLabel") },
        { icon: "trendingUp", accent: "green", value: inProgress, label: ns.i18n.t("projects.kpiInProgressLabel") },
        { icon: "layoutDashboard", accent: "teal", value: readyToStart, label: ns.i18n.t("projects.kpiReadyToStartLabel") },
        { icon: "check", accent: "blue", value: completed, label: ns.i18n.t("projects.kpiCompletedLabel") }
      ];
      document.getElementById("projects-kpi-grid").innerHTML = items.map(ph.kpiCardHtml).join("");
    }

    function renderTabs() {
      var countByStage = {};
      var noStageCount = 0;
      allProjects.forEach(function (p) {
        if (!p.stage) {
          noStageCount++;
          return;
        }
        countByStage[p.stage] = (countByStage[p.stage] || 0) + 1;
      });

      var tabs = [{ key: "all", label: ns.i18n.t("projects.tabAll"), count: allProjects.length }];
      STAGE_ORDER.forEach(function (stageLabelText) {
        if (!countByStage[stageLabelText]) return;
        tabs.push({ key: stageLabelText, label: ph.airtableStageLabel(stageLabelText), count: countByStage[stageLabelText] });
      });
      if (noStageCount > 0) {
        tabs.push({ key: NO_STAGE_KEY, label: ns.i18n.t("projects.tabNoStage"), count: noStageCount });
      }

      var host = document.getElementById("projects-tabs-root");
      host.innerHTML = ph.tabsHtml(tabs, activeTab, ns.i18n.t("projectFields.stage"));
      host.querySelectorAll("[data-tab-key]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          activeTab = btn.getAttribute("data-tab-key");
          renderTabs();
          renderTable();
        });
      });
    }

    function loadProjects() {
      renderLoading();
      api
        .getProjects()
        .then(function (projects) {
          allProjects = projects;
          populateFilters();
          renderKpis();
          renderTabs();
          renderTable();
        })
        .catch(function (err) {
          console.error("[projects] Failed to load projects from the backend:", err);
          renderError();
        });
    }

    searchInput.addEventListener("input", renderTable);
    statusSelect.addEventListener("change", renderTable);

    loadProjects();
  });
})(window.IQRAA);
