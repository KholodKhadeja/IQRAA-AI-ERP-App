/* Admin Overview content (screens.md §6.1).

   2026-09-22 "Connect Admin Dashboard to Airtable": this page now renders
   real, live-computed data from js/services/dashboard-api.js (GET
   /api/dashboard/admin on the existing backend, which reads Leads/
   Projects/Tasks/Payments/Users from Airtable and returns one aggregated
   JSON summary) instead of js/data/mock-data.js's data.projects/data.kpis/
   data.recentActivity/data.projectManagers. A fresh fetch runs every time
   this page loads (see loadDashboard() below) — nothing is cached client-
   side across loads, so editing a record in Airtable and reloading this
   page reflects the change.

   js/data/mock-data.js + js/services/project-helpers.js are still loaded
   (see pages/dashboard-admin.html) purely for their pure formatting/label
   helpers that don't depend on mock records — ph.formatDate/formatCurrency/
   badge/projectLink/airtableStageLabel/airtableStatusBadge — the exact
   same reuse pattern already established by js/pages/projects.js for the
   real-data Projects List.

   Known, documented scope limits (not bugs — see backend/server.js's
   Admin Dashboard section for the full reasoning):
   - "Recent Activity" has no backing Airtable table in this task's scope
     (Leads/Projects/Tasks/Payments/Users/Clients/Meetings & Decisions —
     none of them is an activity log), so that panel always renders its
     existing empty state rather than continuing to show fake mock
     activity (CLAUDE.md's "no mock data" rule).
   - "Assign PM" in the Ready-to-Start table is real UI but not wired to
     an Airtable write (this task is read-only/GET) — confirming opens the
     same "not connected yet" note already used by leads.html's Create
     button (CLAUDE.md §18's external-integration-placeholder convention)
     instead of silently mutating local state that would vanish on the
     next real fetch. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.dashboardApi;
    if (!ph || !api) return;

    var SECTION_IDS = [
      "admin-kpi-grid",
      "admin-active-projects-body",
      "admin-stage-summary",
      "admin-ready-to-start-body",
      "admin-pm-workload-list"
    ];

    var PAYMENT_STATUS_TONE = { Paid: "success", Pending: "warning", Overdue: "danger" };

    function paymentStatusBadge(statusLabelText) {
      if (!statusLabelText) return ph.badge(ns.i18n.t("projectFields.unassigned"), "neutral");
      return ph.badge(statusLabelText, PAYMENT_STATUS_TONE[statusLabelText] || "neutral");
    }

    function kpiIcon(name, accent) {
      var accentClass = accent ? " kpi-card__icon--" + accent : "";
      return '<span class="kpi-card__icon' + accentClass + '" aria-hidden="true">' + ns.icons[name](20) + "</span>";
    }

    /* Interpolates between the pale and dark ends of the brand purple scale
       so a stage with more projects in it reads as visibly "deeper" than a
       barely-populated one — a sequential encoding of the same count the
       bar's width and the number already show, not decoration for its own
       sake. ratio is 0..1 (a stage's count / the busiest stage's count). */
    function stagePurple(ratio) {
      var from = [239, 237, 251]; // ~ --primary-pale
      var to = [81, 66, 184]; // ~ --primary-dark
      var rgb = from.map(function (c, i) {
        return Math.round(c + (to[i] - c) * ratio);
      });
      return "rgb(" + rgb.join(",") + ")";
    }

    function renderLoading() {
      SECTION_IDS.forEach(function (id) {
        var host = document.getElementById(id);
        if (!host) return;
        host.innerHTML =
          '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
          ns.i18n.t("adminOverview.loading") +
          "</p>";
      });
    }

    function renderError() {
      SECTION_IDS.forEach(function (id) {
        var host = document.getElementById(id);
        if (!host) return;
        host.innerHTML =
          '<div class="panel__empty">' +
          "<p>" + ns.i18n.t("adminOverview.loadError") + "</p>" +
          '<button type="button" class="btn btn--secondary" data-dashboard-retry>' + ns.i18n.t("adminOverview.retry") + "</button>" +
          "</div>";
      });
      document.querySelectorAll("[data-dashboard-retry]").forEach(function (btn) {
        btn.addEventListener("click", loadDashboard);
      });
    }

    function renderKpis(kpis) {
      var items = [
        { icon: "trendingUp", accent: "green", value: kpis.newLeads, labelKey: "adminOverview.kpiNewLeads", href: "leads.html" },
        { icon: "folder", accent: "purple", value: kpis.activeProjects, labelKey: "adminOverview.kpiProjectsInProgress", href: "projects.html" },
        { icon: "layoutDashboard", accent: "teal", value: kpis.readyToStart, labelKey: "adminOverview.kpiProjectsReadyToStart", href: "projects.html" },
        { icon: "check", accent: "blue", value: kpis.pendingClientApprovals, labelKey: "adminOverview.kpiPendingApprovals" },
        { icon: "alertTriangle", accent: "rose", value: kpis.overdueTasks, labelKey: "adminOverview.kpiOverdueTasks" },
        { icon: "creditCard", accent: "amber", value: ph.formatCurrency(kpis.outstandingPaymentsAmount), labelKey: "adminOverview.kpiOutstandingPayments", href: "billing.html" }
      ];
      document.getElementById("admin-kpi-grid").innerHTML = items
        .map(function (item) {
          var tag = item.href ? "a" : "div";
          var hrefAttr = item.href ? ' href="' + item.href + '"' : "";
          return (
            "<" + tag + ' class="kpi-card kpi-card--' + item.accent + '"' + hrefAttr + ">" +
            kpiIcon(item.icon, item.accent) +
            '<span class="kpi-card__value">' + item.value + "</span>" +
            '<span class="kpi-card__label">' + ns.i18n.t(item.labelKey) + "</span>" +
            "</" + tag + ">"
          );
        })
        .join("");
    }

    /* Personalized greeting banner — reuses kpis already fetched for the
       KPI row (no extra request) to build a one-line live summary instead
       of a static "welcome" caption. See css/components/data-display.css's
       .overview-hero for the shared, role-agnostic styling. */
    function heroGreetingKey() {
      var hour = new Date().getHours();
      if (hour < 12) return "adminOverview.heroGreetingMorning";
      if (hour < 18) return "adminOverview.heroGreetingAfternoon";
      return "adminOverview.heroGreetingEvening";
    }

    function renderHero(kpis, user) {
      var host = document.getElementById("admin-overview-hero");
      if (!host) return;
      var name = (user && (user.fullName || user.email)) || "";
      var greeting = ns.i18n.t(heroGreetingKey()) + (name ? ", " + name : "") + " 👋";

      var subtitleParts = [];
      if (kpis.newLeads > 0) subtitleParts.push(kpis.newLeads + " " + ns.i18n.t("adminOverview.heroSubtitleLeadsPart"));
      if (kpis.overdueTasks > 0) subtitleParts.push(kpis.overdueTasks + " " + ns.i18n.t("adminOverview.heroSubtitleOverduePart"));
      var subtitle = subtitleParts.length ? subtitleParts.join(" · ") : ns.i18n.t("adminOverview.heroSubtitleAllGood");

      var cta = kpis.newLeads > 0
        ? { href: "leads.html", labelKey: "adminOverview.heroCtaLeads" }
        : { href: "projects.html", labelKey: "adminOverview.heroCtaProjects" };

      host.innerHTML =
        '<h2 class="overview-hero__title">' + greeting + "</h2>" +
        '<p class="overview-hero__subtitle">' + subtitle + "</p>" +
        '<div class="overview-hero__actions">' +
        '<a class="overview-hero__cta" href="' + cta.href + '">' +
        ns.icons.arrowLeft(16) +
        "<span>" + ns.i18n.t(cta.labelKey) + "</span>" +
        "</a>" +
        "</div>";
    }

    function renderActiveProjects(projects) {
      var host = document.getElementById("admin-active-projects-body");
      if (projects.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("adminOverview.emptyActiveProjects") + "</p>";
        return;
      }
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("projectFields.project") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.client") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.pm") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.stage") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.progress") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.deadline") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.status") + "</th>" +
        "</tr>";
      var rows = projects
        .map(function (p) {
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("projectFields.project") + '">' +
            '<a class="data-table__primary" href="' + ph.projectLink(p.id) + '">' + (p.name || ns.i18n.t("projectFields.unassigned")) + "</a>" +
            "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.client") + '">' + (p.client || ns.i18n.t("projectFields.unassigned")) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.pm") + '">' + (p.pmName || ns.i18n.t("projectFields.unassigned")) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.stage") + '">' + ph.airtableStageLabel(p.stage) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.progress") + '">' +
            '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + (p.progress || 0) + '%"></div></div>' +
            "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.deadline") + '">' + ph.formatDate(p.deadline) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.status") + '">' + ph.airtableStatusBadge(p.status) + "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";
    }

    function renderStageSummary(projectsByStage) {
      var host = document.getElementById("admin-stage-summary");
      var max = 1;
      projectsByStage.forEach(function (row) {
        if (row.count > max) max = row.count;
      });
      host.innerHTML = projectsByStage
        .map(function (row) {
          var ratio = row.count / max;
          var width = Math.round(ratio * 100);
          var rowClass = "admin-overview__stage-row" + (row.count > 0 ? " admin-overview__stage-row--active" : "");
          var fillStyle = row.count > 0 ? "width:" + width + "%;background:" + stagePurple(ratio) : "width:0%";
          return (
            '<div class="' + rowClass + '">' +
            '<span class="admin-overview__stage-label">' + ph.airtableStageLabel(row.stage) + "</span>" +
            '<span class="admin-overview__stage-bar progress-bar"><span class="progress-bar__fill" style="' + fillStyle + '"></span></span>' +
            '<span class="admin-overview__stage-count">' + row.count + "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    function renderReadyToStart(projects) {
      var host = document.getElementById("admin-ready-to-start-body");
      if (projects.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("adminOverview.emptyReadyToStart") + "</p>";
        return;
      }
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("projectFields.project") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.client") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.payment") + "</th>" +
        "<th>" + ns.i18n.t("adminOverview.assignPmLabel") + "</th>" +
        "</tr>";
      var rows = projects
        .map(function (p) {
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("projectFields.project") + '">' + (p.name || ns.i18n.t("projectFields.unassigned")) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.client") + '">' + (p.client || ns.i18n.t("projectFields.unassigned")) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.payment") + '">' + paymentStatusBadge(p.firstPaymentStatus) + "</td>" +
            '<td data-label="' + ns.i18n.t("adminOverview.assignPmLabel") + '">' +
            '<button type="button" class="btn btn--secondary" data-assign-confirm="' + p.id + '">' +
            ns.icons.userPlus(16) +
            "<span>" + ns.i18n.t("adminOverview.assignPmConfirm") + "</span>" +
            "</button>" +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";

      host.querySelectorAll("[data-assign-confirm]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          ns.components.modal.open(ns.i18n.t("adminOverview.assignPmLabel"), '<p class="note-text">' + ns.i18n.t("adminOverview.assignPmNotConnected") + "</p>");
        });
      });
    }

    function renderPmWorkload(pmWorkload) {
      var host = document.getElementById("admin-pm-workload-list");
      if (pmWorkload.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("adminOverview.emptyPmWorkload") + "</p>";
        return;
      }
      host.innerHTML = pmWorkload
        .map(function (pm) {
          var name = pm.name || ns.i18n.t("projectFields.unassigned");
          var initial = name.charAt(0).toUpperCase();
          return (
            '<div class="admin-overview__pm-row">' +
            '<span class="admin-overview__pm-identity">' +
            '<span class="avatar" aria-hidden="true">' + initial + "</span>" +
            '<span class="admin-overview__pm-name">' + name + "</span>" +
            "</span>" +
            '<span class="admin-overview__pm-stats">' +
            "<span>" + pm.projectCount + " " + ns.i18n.t("adminOverview.workloadActiveLabel") + "</span>" +
            (pm.attentionCount > 0
              ? "<span>" + pm.attentionCount + " " + ns.i18n.t("adminOverview.workloadAttentionLabel") + "</span>"
              : "") +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    function renderAll(dashboard, user) {
      renderHero(dashboard.kpis, user);
      renderKpis(dashboard.kpis);
      renderActiveProjects(dashboard.activeProjects);
      renderStageSummary(dashboard.projectsByStage);
      renderReadyToStart(dashboard.readyToStart);
      renderPmWorkload(dashboard.pmWorkload);
      /* No Airtable table backs "Recent Activity" in this task's scope —
         always its existing empty state rather than fake mock data. */
      ph.renderActivityList("admin-activity-list", []);
    }

    function loadDashboard() {
      renderLoading();
      /* ns.workspaceAuthReady is the same session check workspace-chrome.js
         already runs to gate this page — reused here (not a second fetch)
         purely to get the signed-in admin's name for the hero greeting. */
      Promise.all([api.getAdminDashboard(), ns.workspaceAuthReady])
        .then(function (results) {
          renderAll(results[0], results[1] && results[1].user);
        })
        .catch(function (err) {
          console.error("[dashboard-admin] Failed to load dashboard data from the backend:", err);
          renderError();
        });
    }

    loadDashboard();
  });
})(window.IQRAA);
