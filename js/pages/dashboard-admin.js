/* Admin Overview content (screens.md §6.1). Renders into the containers
   already present in pages/dashboard-admin.html; re-renders on language
   change (same pattern as login.html's flowSteps) since every label here
   is produced via ns.i18n.t() at render time rather than data-i18n
   attributes on dynamically-injected markup. The table/stage-summary/
   activity rendering itself lives in services/project-helpers.js, shared
   with PM Overview (js/pages/dashboard-pm.js) — this file only computes
   which projects/activity belong on the Admin view (everything) and wires
   the "assign PM" interaction. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var data = ns.data;
    var ph = ns.services.projectHelpers;
    if (!data || !ph) return;

    function kpiIcon(name) {
      return '<span class="kpi-card__icon" aria-hidden="true">' + ns.icons[name](20) + "</span>";
    }

    function renderKpis() {
      var active = data.projects.filter(function (p) {
        return p.status !== "readyToStart";
      });
      var ready = data.projects.filter(function (p) {
        return p.status === "readyToStart";
      });
      var items = [
        { icon: "trendingUp", value: data.kpis.newLeads, labelKey: "adminOverview.kpiNewLeads", href: "leads.html" },
        { icon: "folder", value: active.length, labelKey: "adminOverview.kpiProjectsInProgress", href: "projects.html" },
        { icon: "layoutDashboard", value: ready.length, labelKey: "adminOverview.kpiProjectsReadyToStart", href: "projects.html" },
        { icon: "check", value: data.kpis.pendingApprovals, labelKey: "adminOverview.kpiPendingApprovals" },
        { icon: "alertTriangle", value: data.kpis.overdueTasks, labelKey: "adminOverview.kpiOverdueTasks" },
        { icon: "creditCard", value: ph.formatCurrency(ph.billingTotals().pending), labelKey: "adminOverview.kpiOutstandingPayments", href: "billing.html" }
      ];
      document.getElementById("admin-kpi-grid").innerHTML = items
        .map(function (item) {
          var tag = item.href ? "a" : "div";
          var hrefAttr = item.href ? ' href="' + item.href + '"' : "";
          return (
            "<" + tag + ' class="kpi-card"' + hrefAttr + ">" +
            kpiIcon(item.icon) +
            '<span class="kpi-card__value">' + item.value + "</span>" +
            '<span class="kpi-card__label">' + ns.i18n.t(item.labelKey) + "</span>" +
            "</" + tag + ">"
          );
        })
        .join("");
    }

    function renderReadyToStart() {
      var host = document.getElementById("admin-ready-to-start-body");
      var projects = data.projects.filter(function (p) {
        return p.status === "readyToStart";
      });
      if (projects.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("adminOverview.emptyReadyToStart") + "</p>";
        return;
      }
      var pmOptions = data.projectManagers
        .map(function (pm) {
          return '<option value="' + pm.id + '">' + pm.name + "</option>";
        })
        .join("");
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
            '<td data-label="' + ns.i18n.t("projectFields.project") + '">' + p.name + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.client") + '">' + ph.clientName(p.clientId) + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.payment") + '">' + ph.paymentBadge(p.paymentState) + "</td>" +
            '<td data-label="' + ns.i18n.t("adminOverview.assignPmLabel") + '">' +
            '<div class="admin-overview__assign-row">' +
            '<select class="select" data-assign-select="' + p.id + '" aria-label="' + ns.i18n.t("adminOverview.assignPmLabel") + '">' +
            '<option value="">' + ns.i18n.t("adminOverview.assignPmPlaceholder") + "</option>" +
            pmOptions +
            "</select>" +
            '<button type="button" class="btn btn--secondary" data-assign-confirm="' + p.id + '">' +
            ns.icons.userPlus(16) +
            "<span>" + ns.i18n.t("adminOverview.assignPmConfirm") + "</span>" +
            "</button>" +
            "</div>" +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";

      host.querySelectorAll("[data-assign-confirm]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var projectId = btn.getAttribute("data-assign-confirm");
          var select = host.querySelector('[data-assign-select="' + projectId + '"]');
          if (!select || !select.value) {
            if (select) select.focus();
            return;
          }
          assignPm(projectId, select.value);
        });
      });
    }

    function renderPmWorkload() {
      document.getElementById("admin-pm-workload-list").innerHTML = data.projectManagers
        .map(function (pm) {
          var assigned = data.projects.filter(function (p) {
            return p.pmId === pm.id;
          });
          var attention = assigned.filter(function (p) {
            return p.status === "attention" || p.status === "overdue";
          });
          var initial = pm.name.charAt(0).toUpperCase();
          return (
            '<div class="admin-overview__pm-row">' +
            '<span class="admin-overview__pm-identity">' +
            '<span class="avatar" aria-hidden="true">' + initial + "</span>" +
            '<span class="admin-overview__pm-name">' + pm.name + "</span>" +
            "</span>" +
            '<span class="admin-overview__pm-stats">' +
            "<span>" + assigned.length + " " + ns.i18n.t("adminOverview.workloadActiveLabel") + "</span>" +
            (attention.length > 0
              ? "<span>" + attention.length + " " + ns.i18n.t("adminOverview.workloadAttentionLabel") + "</span>"
              : "") +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    }

    function assignPm(projectId, pmId) {
      var project = ph.getProject(projectId);
      if (!project) return;
      project.pmId = pmId;
      project.status = "onTrack";
      project.stageKey = "specification";
      project.progress = 0;
      var deadline = new Date();
      deadline.setDate(deadline.getDate() + 45);
      project.deadline = deadline.toISOString().slice(0, 10);
      renderAll();
    }

    function renderAll() {
      var activeProjects = data.projects.filter(function (p) {
        return p.status !== "readyToStart";
      });
      renderKpis();
      ph.renderProjectsTable("admin-active-projects-body", activeProjects, "adminOverview.emptyActiveProjects");
      ph.renderStageSummary("admin-stage-summary", data.projects);
      renderReadyToStart();
      renderPmWorkload();
      ph.renderActivityList("admin-activity-list", data.recentActivity);
    }

    renderAll();
  });
})(window.IQRAA);
