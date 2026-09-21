/* Shared formatting/lookup helpers and reusable render functions over
   js/data/mock-data.js, used by every page that renders project data
   (Admin Overview, PM Overview, Projects List, Project Workspace) so
   status-tone mapping, date/currency formatting, badge markup and the
   Active-Projects-table/Recent-Activity/Stage-Summary layouts are defined
   once — see CLAUDE.md §9/§19, screens.md §33. PM Overview (screens.md
   §38 Step 7) reuses the exact same render* functions as Admin Overview,
   just with a pre-filtered projects array, instead of a second copy of
   the same markup-building code. */
window.IQRAA = window.IQRAA || {};
IQRAA.services = IQRAA.services || {};

IQRAA.services.projectHelpers = (function (ns) {
  var STATUS_TONE = { onTrack: "success", attention: "warning", overdue: "danger", readyToStart: "info" };
  var PAYMENT_TONE = { paid: "success", partial: "warning", firstPaymentReceived: "info" };
  var TASK_STATUS_TONE = { notStarted: "neutral", inProgress: "info", waiting: "warning", review: "warning", completed: "success" };
  var PRIORITY_TONE = { low: "neutral", medium: "warning", high: "danger" };

  function locale() {
    return "he-IL";
  }

  function formatDate(iso) {
    if (!iso) return ns.i18n.t("projectFields.noDeadline");
    return new Date(iso).toLocaleDateString(locale(), { year: "numeric", month: "short", day: "numeric" });
  }

  function formatDateTime(iso) {
    return new Date(iso).toLocaleString(locale(), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatCurrency(amount) {
    return "₪" + amount.toLocaleString(locale());
  }

  function isOverdue(iso) {
    if (!iso) return false;
    return new Date(iso) < new Date(new Date().toDateString());
  }

  function pmName(pmId) {
    var match = ns.data.projectManagers.filter(function (pm) {
      return pm.id === pmId;
    })[0];
    return match ? match.name : ns.i18n.t("projectFields.unassigned");
  }

  function getClient(clientId) {
    return (
      ns.data.clients.filter(function (c) {
        return c.id === clientId;
      })[0] || null
    );
  }

  function clientName(clientId) {
    var client = getClient(clientId);
    return client ? client.name : ns.i18n.t("projectFields.unassigned");
  }

  function stageIndex(stageKey) {
    var index = -1;
    ns.data.pipelineStages.forEach(function (stage, i) {
      if (stage.key === stageKey) index = i;
    });
    return index;
  }

  function stageLabel(stageKey) {
    var index = stageIndex(stageKey);
    return index === -1 ? ns.i18n.t("projectFields.unassigned") : ns.i18n.t(ns.data.pipelineStages[index].labelKey);
  }

  function statusLabel(status) {
    return ns.i18n.t("status." + status);
  }

  function badge(labelText, tone) {
    return '<span class="badge badge--' + tone + '">' + labelText + "</span>";
  }

  /* Shared label-above-value field markup (css/components/data-display.css
     .field-row) — project/task detail rows, client-facing summary cards,
     modal bodies all build on this instead of each defining their own.
     valueHtml may be plain text or markup (e.g. a badge span). */
  function fieldRow(labelKey, valueHtml) {
    return (
      '<div class="field-row">' +
      '<span class="field-row__label">' + ns.i18n.t(labelKey) + "</span>" +
      '<span class="field-row__value">' + valueHtml + "</span>" +
      "</div>"
    );
  }

  function statusBadge(status) {
    return badge(statusLabel(status), STATUS_TONE[status] || "neutral");
  }

  function paymentBadge(paymentState) {
    return badge(ns.i18n.t("status." + paymentState), PAYMENT_TONE[paymentState] || "neutral");
  }

  function taskStatusBadge(status) {
    return badge(ns.i18n.t("taskStatus." + status), TASK_STATUS_TONE[status] || "neutral");
  }

  function priorityBadge(priority) {
    return badge(ns.i18n.t("priority." + priority), PRIORITY_TONE[priority] || "neutral");
  }

  function getProject(id) {
    var match = ns.data.projects.filter(function (p) {
      return p.id === id;
    })[0];
    return match || null;
  }

  function projectsForPm(pmId) {
    return ns.data.projects.filter(function (p) {
      return p.pmId === pmId;
    });
  }

  function projectsForTeamMember(memberId) {
    return ns.data.projects.filter(function (p) {
      return p.teamIds && p.teamIds.indexOf(memberId) !== -1;
    });
  }

  function tasksForProjects(projectIds) {
    return ns.data.tasks.filter(function (t) {
      return projectIds.indexOf(t.projectId) !== -1;
    });
  }

  function isInvoiceOverdue(project) {
    if (!project.invoiceDueDate) return false;
    if (project.received >= project.totalValue) return false;
    return new Date(project.invoiceDueDate) < new Date(new Date().toDateString());
  }

  function invoiceStatusKey(project) {
    if (project.received >= project.totalValue) return "paid";
    if (isInvoiceOverdue(project)) return "overdue";
    return "pending";
  }

  var INVOICE_STATUS_TONE = { paid: "success", pending: "warning", overdue: "danger" };

  function invoiceStatusBadge(project) {
    var key = invoiceStatusKey(project);
    return badge(ns.i18n.t("invoiceStatus." + key), INVOICE_STATUS_TONE[key]);
  }

  /* Totals shown by both Admin Overview's "Outstanding Payments" KPI and
     the Billing Overview screen — computed here once so the two screens
     can never disagree about the same number (see CLAUDE.md §9). */
  function billingTotals() {
    var totalValue = 0;
    var received = 0;
    var overdueAmount = 0;
    ns.data.projects.forEach(function (p) {
      totalValue += p.totalValue || 0;
      received += p.received || 0;
      if (isInvoiceOverdue(p)) overdueAmount += (p.totalValue || 0) - (p.received || 0);
    });
    return { totalValue: totalValue, received: received, pending: totalValue - received, overdueAmount: overdueAmount };
  }

  function projectLink(projectId) {
    return "project-workspace.html?id=" + encodeURIComponent(projectId);
  }

  /* Renders the same 7-column table used by Admin Overview's "Active
     Projects" and PM Overview's "My Active Projects" — pass whichever
     projects array is already scoped for the viewer. */
  function renderProjectsTable(containerId, projects, emptyKey) {
    var host = document.getElementById(containerId);
    if (!host) return;
    if (projects.length === 0) {
      host.innerHTML = '<p class="panel__empty">' + ns.i18n.t(emptyKey) + "</p>";
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
          '<a class="data-table__primary" href="' + projectLink(p.id) + '">' + p.name + "</a>" +
          "</td>" +
          '<td data-label="' + ns.i18n.t("projectFields.client") + '">' + clientName(p.clientId) + "</td>" +
          '<td data-label="' + ns.i18n.t("projectFields.pm") + '">' + pmName(p.pmId) + "</td>" +
          '<td data-label="' + ns.i18n.t("projectFields.stage") + '">' + stageLabel(p.stageKey) + "</td>" +
          '<td data-label="' + ns.i18n.t("projectFields.progress") + '">' +
          '<div class="progress-bar"><div class="progress-bar__fill" style="width:' + p.progress + '%"></div></div>' +
          "</td>" +
          '<td data-label="' + ns.i18n.t("projectFields.deadline") + '">' + formatDate(p.deadline) + "</td>" +
          '<td data-label="' + ns.i18n.t("projectFields.status") + '">' + statusBadge(p.status) + "</td>" +
          "</tr>"
        );
      })
      .join("");
    host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";
  }

  function renderStageSummary(containerId, projects) {
    var host = document.getElementById(containerId);
    if (!host) return;
    var counts = {};
    ns.data.pipelineStages.forEach(function (s) {
      counts[s.key] = 0;
    });
    projects.forEach(function (p) {
      if (p.stageKey && counts[p.stageKey] !== undefined) counts[p.stageKey] += 1;
    });
    var max = 1;
    Object.keys(counts).forEach(function (key) {
      if (counts[key] > max) max = counts[key];
    });
    host.innerHTML = ns.data.pipelineStages
      .map(function (s) {
        var count = counts[s.key];
        var width = Math.round((count / max) * 100);
        return (
          '<div class="admin-overview__stage-row">' +
          '<span class="admin-overview__stage-label">' + ns.i18n.t(s.labelKey) + "</span>" +
          '<span class="admin-overview__stage-bar progress-bar"><span class="progress-bar__fill" style="width:' + width + '%"></span></span>' +
          '<span class="admin-overview__stage-count">' + count + "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderActivityList(containerId, items) {
    var host = document.getElementById(containerId);
    if (!host) return;
    if (items.length === 0) {
      host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("adminOverview.emptyActivity") + "</p>";
      return;
    }
    var sorted = items.slice().sort(function (a, b) {
      return new Date(b.when) - new Date(a.when);
    });
    host.innerHTML = sorted
      .map(function (item) {
        var project = item.projectId ? getProject(item.projectId) : null;
        var text = ns.i18n.t(item.textKey) + (project ? " " + project.name : "");
        return (
          '<div class="activity-item">' +
          '<span class="activity-item__icon" aria-hidden="true">' + ns.icons[item.icon](16) + "</span>" +
          '<span class="activity-item__body">' +
          '<span class="activity-item__text">' + text + "</span>" +
          '<span class="activity-item__meta">' + formatDateTime(item.when) + "</span>" +
          "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  var TASK_STATUS_ORDER = ["notStarted", "inProgress", "waiting", "review", "completed"];

  function teamMemberName(memberId) {
    var match = ns.data.teamMembers.filter(function (m) {
      return m.id === memberId;
    })[0];
    return match ? match.name : ns.i18n.t("projectFields.unassigned");
  }

  /* Renders a lightweight kanban board (one column per task status) into
     containerId. onTaskClick(task) fires when a card is activated — the
     caller decides what "open" means (Project Workspace opens the shared
     modal component with task detail). */
  function renderTaskBoard(containerId, tasks, onTaskClick) {
    var host = document.getElementById(containerId);
    if (!host) return;
    if (tasks.length === 0) {
      host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("projectWorkspace.noTasks") + "</p>";
      return;
    }
    host.innerHTML = TASK_STATUS_ORDER
      .map(function (status) {
        var columnTasks = tasks.filter(function (t) {
          return t.status === status;
        });
        var cards = columnTasks
          .map(function (task) {
            var overdue = task.status !== "completed" && isOverdue(task.dueDate);
            var dueLabel = formatDate(task.dueDate) + (overdue ? ns.i18n.t("projectWorkspace.taskOverdueSuffix") : "");
            return (
              '<button type="button" class="task-card" data-task-id="' + task.id + '">' +
              '<span class="task-card__title">' + task.title + "</span>" +
              '<span class="task-card__meta">' +
              priorityBadge(task.priority) +
              '<span class="avatar" aria-hidden="true">' + teamMemberName(task.assigneeId).charAt(0).toUpperCase() + "</span>" +
              "</span>" +
              '<span class="task-card__due' + (overdue ? " task-card__due--overdue" : "") + '">' + dueLabel + "</span>" +
              "</button>"
            );
          })
          .join("");
        return (
          '<div class="task-column">' +
          '<div class="task-column__header">' + ns.i18n.t("taskStatus." + status) + " (" + columnTasks.length + ")</div>" +
          cards +
          "</div>"
        );
      })
      .join("");

    if (onTaskClick) {
      host.querySelectorAll("[data-task-id]").forEach(function (card) {
        card.addEventListener("click", function () {
          var task = tasks.filter(function (t) {
            return t.id === card.getAttribute("data-task-id");
          })[0];
          if (task) onTaskClick(task);
        });
      });
    }
  }

  /* The 11-stage pipeline stepper markup shared by Project Workspace
     (internal) and the Client Project View (client-safe) — same visual,
     same "Changes loops back to Production" note, two different panel
     wrappers around it (see each page's own render function). */
  function pipelineStepperHtml(project) {
    var currentIndex = stageIndex(project.stageKey);
    var steps = ns.data.pipelineStages
      .map(function (stage, index) {
        var state = "upcoming";
        if (currentIndex !== -1) {
          if (index < currentIndex) state = "complete";
          else if (index === currentIndex) state = "current";
        }
        var dotContent = state === "complete" ? ns.icons.check(14) : String(index + 1);
        var connector =
          index === 0
            ? ""
            : '<span class="pipeline-stepper__connector' +
              (currentIndex !== -1 && index <= currentIndex ? " pipeline-stepper__connector--complete" : "") +
              '"></span>';
        return (
          connector +
          '<span class="pipeline-stepper__step pipeline-stepper__step--' + state + '">' +
          '<span class="pipeline-stepper__dot">' + dotContent + "</span>" +
          '<span class="pipeline-stepper__label">' + ns.i18n.t(stage.labelKey) + "</span>" +
          "</span>"
        );
      })
      .join("");
    return '<div class="pipeline-stepper">' + steps + "</div>";
  }

  var CLIENT_ACTION_STAGES = ["clientScriptApproval", "clientReview", "clientApproval"];

  function needsClientAction(project) {
    return CLIENT_ACTION_STAGES.indexOf(project.stageKey) !== -1;
  }

  function pmEmail(pmId) {
    var match = ns.data.projectManagers.filter(function (pm) {
      return pm.id === pmId;
    })[0];
    return match ? match.email : "";
  }

  function projectsForClient(clientId) {
    return ns.data.projects.filter(function (p) {
      return p.clientId === clientId;
    });
  }

  function renderMeetingsList(containerId, meetings) {
    var host = document.getElementById(containerId);
    if (!host) return;
    if (meetings.length === 0) {
      host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("projectWorkspace.noMeetings") + "</p>";
      return;
    }
    var sorted = meetings.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });
    host.innerHTML = sorted
      .map(function (meeting) {
        var decisions = meeting.decisions.length
          ? "<ul>" + meeting.decisions.map(function (d) { return "<li>" + d + "</li>"; }).join("") + "</ul>"
          : "";
        var followUps = meeting.followUpTasks.length
          ? "<ul>" + meeting.followUpTasks.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>"
          : "";
        return (
          '<div class="meeting-item">' +
          '<div class="meeting-item__header">' +
          '<span class="badge badge--info">' + ns.i18n.t(meeting.typeKey) + "</span>" +
          '<span class="meeting-item__date">' + formatDate(meeting.date) + "</span>" +
          "</div>" +
          '<p class="meeting-item__participants">' + ns.i18n.t("meetingFields.participants") + ": " + meeting.participants.join(", ") + "</p>" +
          '<p class="meeting-item__summary">' + meeting.summary + "</p>" +
          (decisions ? '<div class="meeting-item__block"><strong>' + ns.i18n.t("meetingFields.decisions") + "</strong>" + decisions + "</div>" : "") +
          (followUps ? '<div class="meeting-item__block"><strong>' + ns.i18n.t("meetingFields.followUpTasks") + "</strong>" + followUps + "</div>" : "") +
          "</div>"
        );
      })
      .join("");
  }

  return {
    STATUS_TONE: STATUS_TONE,
    PAYMENT_TONE: PAYMENT_TONE,
    locale: locale,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatCurrency: formatCurrency,
    isOverdue: isOverdue,
    pmName: pmName,
    getClient: getClient,
    clientName: clientName,
    stageIndex: stageIndex,
    stageLabel: stageLabel,
    statusLabel: statusLabel,
    badge: badge,
    fieldRow: fieldRow,
    statusBadge: statusBadge,
    paymentBadge: paymentBadge,
    taskStatusBadge: taskStatusBadge,
    priorityBadge: priorityBadge,
    getProject: getProject,
    projectsForPm: projectsForPm,
    projectsForTeamMember: projectsForTeamMember,
    tasksForProjects: tasksForProjects,
    teamMemberName: teamMemberName,
    projectLink: projectLink,
    isInvoiceOverdue: isInvoiceOverdue,
    invoiceStatusKey: invoiceStatusKey,
    invoiceStatusBadge: invoiceStatusBadge,
    billingTotals: billingTotals,
    pipelineStepperHtml: pipelineStepperHtml,
    needsClientAction: needsClientAction,
    pmEmail: pmEmail,
    projectsForClient: projectsForClient,
    renderProjectsTable: renderProjectsTable,
    renderStageSummary: renderStageSummary,
    renderActivityList: renderActivityList,
    renderTaskBoard: renderTaskBoard,
    renderMeetingsList: renderMeetingsList
  };
})(window.IQRAA);
