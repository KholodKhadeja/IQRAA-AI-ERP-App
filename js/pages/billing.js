/* Billing — Invoices + Payments (Admin financial management audit,
   2026-09-22). Upgrades the previous single flat "one row per Payment"
   screen into two distinct panels, per that task's explicit "Invoice
   Status and Payment Status are not the same thing" requirement:

     Invoices panel  — one row per real Invoice record. Its own free-text
       "status" (Airtable's Invoices.Status, singleLineText) is shown
       as-is; its "payment status" (unpaid/partial/paid/overdue) is a
       value computed server-side (backend/server.js) from the SUM of
       that invoice's linked Payments, never guessed here.
     Payments panel — one row per real Payment record, independent of any
       invoice's status — its own Status (Pending/Paid/Overdue) is shown
       as-is.

   Both come from the same GET /api/billing call (js/services/billing-
   api.js) — one fetch, two panels — re-run on every page load, same as
   before. "Create Invoice" POSTs to the real, already-built WF1 n8n
   webhook; "Record Payment" still POSTs to a currently-empty placeholder
   (CLAUDE.md §18/§19's external-integration-placeholder convention) and
   shows a translated "not configured" message rather than a fake success.

   **Invoice <-> Lead integration (2026-09-25)**: Invoices now carries a
   real "Lead ID" linked-record field (added directly in Airtable), and
   the existing, already-live "payment-via-app-update" n8n workflow was
   rebuilt around it (unchanged by this task, per explicit instruction —
   see js/services/finance-webhooks.js's file comment for the exact node
   graph read directly from n8n before wiring this up). Given an
   invoice_id it now sets that Invoice's own Status to "PAID" and, via its
   Lead ID link, sets the linked Lead's Status to "First payment paid" —
   it no longer touches the Payments table at all. The per-invoice
   "ביצוע תשלום" action here calls that same webhook; button visibility is
   now driven directly by the Invoice's own raw Status text (invoiceIsPaid()
   below), not by any linked Payment record — the old Payment-search-based
   eligiblePaymentForInvoice() gate this screen used before is gone along
   with the workflow logic it existed to work around. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.billingApi;
    var webhooks = ns.services.financeWebhooks;
    if (!ph || !api || !webhooks) return;

    var PLACEHOLDER = "—";
    /* Best-effort color hint only for known values of what is otherwise a
       free-text Airtable field (Invoices.Status / Payments.Status) — the
       raw text itself is always shown untranslated, never looked up
       through i18n (CLAUDE.md §12 only covers closed vocabularies). */
    var RAW_STATUS_TONE = {
      paid: "success", pending: "warning", overdue: "danger", sent: "info", draft: "neutral",
      "on-hold": "warning", processing: "info",
      /* The WF1 n8n invoice workflow's own Invoices.Status values. */
      new: "info", validated: "success", invalid: "danger"
    };
    /* How long to wait for the WF1 n8n invoice workflow to actually finish
       (webhook trigger -> client lookup -> create -> validate) before
       telling the admin it hasn't been confirmed yet — see
       pollForInvoiceNumber() / js/services/finance-webhooks.js. */
    var INVOICE_POLL_ATTEMPTS = 8;
    var INVOICE_POLL_INTERVAL_MS = 1800;

    var billingData = { kpis: { invoices: {}, payments: {} }, invoices: [], payments: [] };
    var clientsList = [];

    var invSearch = document.getElementById("invoices-search");
    var invStatusFilter = document.getElementById("invoices-filter-status");
    var invSort = document.getElementById("invoices-sort");
    var invCreateBtn = document.getElementById("invoices-create-btn");

    var paySearch = document.getElementById("payments-search");
    var payStatusFilter = document.getElementById("payments-filter-status");
    var payClientFilter = document.getElementById("payments-filter-client");
    var payProjectFilter = document.getElementById("payments-filter-project");
    var payDueFrom = document.getElementById("payments-filter-due-from");
    var payDueTo = document.getElementById("payments-filter-due-to");
    var paySort = document.getElementById("payments-sort");
    var payCreateBtn = document.getElementById("payments-create-btn");

    function kpiIcon(name) {
      return '<span class="kpi-card__icon" aria-hidden="true">' + ns.icons[name](20) + "</span>";
    }

    function kpiCardHtml(item) {
      return (
        '<div class="kpi-card billing-kpi-card billing-kpi-card--' + item.tone + '">' +
        kpiIcon(item.icon) +
        '<span class="kpi-card__value">' + item.value + "</span>" +
        '<span class="kpi-card__label">' + ns.i18n.t(item.labelKey) + "</span>" +
        "</div>"
      );
    }

    function panelIcon(name) {
      return ns.icons[name](18);
    }

    function rawStatusBadge(text) {
      if (!text) return ph.badge(PLACEHOLDER, "neutral");
      var tone = RAW_STATUS_TONE[text.trim().toLowerCase()] || "neutral";
      return ph.badge(text, tone);
    }

    /* Whether this invoice's own raw Status text (Airtable free-text field,
       set directly by the payment-via-app-update n8n workflow to "PAID")
       already reads as paid — the single source of truth for showing the
       "ביצוע תשלום" action, per the 2026-09-25 Invoice<->Lead integration.
       Case-insensitive/trimmed since it's free text, not a select. */
    function invoiceIsPaid(inv) {
      return !!(inv && inv.status && inv.status.trim().toUpperCase() === "PAID");
    }

    function stateHtml(modifier, icon, text) {
      return (
        '<div class="billing-state billing-state--' + modifier + '">' +
        '<span class="billing-state__icon" aria-hidden="true">' + icon + "</span>" +
        '<p class="billing-state__text">' + text + "</p>" +
        "</div>"
      );
    }

    function renderLoading() {
      document.getElementById("billing-invoices-kpi-grid").innerHTML = "";
      document.getElementById("billing-payments-kpi-grid").innerHTML = "";
      document.getElementById("invoices-list-body").innerHTML = stateHtml(
        "loading",
        '<span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(22) + "</span>",
        ns.i18n.t("billing.loading")
      );
      document.getElementById("payments-list-body").innerHTML = "";
    }

    function renderError() {
      document.getElementById("invoices-list-body").innerHTML =
        '<div class="billing-state billing-state--error">' +
        '<span class="billing-state__icon" aria-hidden="true">' + ns.icons.alertTriangle(22) + "</span>" +
        "<p class=\"billing-state__text\">" + ns.i18n.t("billing.loadError") + "</p>" +
        '<button type="button" class="btn btn--secondary" id="billing-retry-btn">' + ns.i18n.t("billing.retry") + "</button>" +
        "</div>";
      document.getElementById("payments-list-body").innerHTML = "";
      var retryBtn = document.getElementById("billing-retry-btn");
      if (retryBtn) retryBtn.addEventListener("click", loadBilling);
    }

    function renderInvoicesKpis() {
      var k = billingData.kpis.invoices || {};
      var items = [
        { icon: "listChecks", tone: "primary", value: String(k.totalInvoices || 0), labelKey: "billing.kpiTotalInvoices" },
        { icon: "creditCard", tone: "success", value: ph.formatCurrency(k.totalInvoicedAmount || 0), labelKey: "billing.kpiTotalInvoicedAmount" },
        { icon: "alertTriangle", tone: "warning", value: String(k.openUnpaidInvoices || 0), labelKey: "billing.kpiOpenInvoices" }
      ];
      document.getElementById("billing-invoices-kpi-grid").innerHTML = items.map(kpiCardHtml).join("");
    }

    function renderPaymentsKpis() {
      var k = billingData.kpis.payments || {};
      var items = [
        { icon: "check", tone: "success", value: ph.formatCurrency(k.totalPaid || 0), labelKey: "billing.kpiTotalPaid" },
        { icon: "clock", tone: "warning", value: ph.formatCurrency(k.totalOutstanding || 0), labelKey: "billing.kpiTotalOutstanding" },
        { icon: "trendingUp", tone: "primary", value: String(k.partiallyPaidInvoices || 0), labelKey: "billing.kpiPartiallyPaid" },
        { icon: "alertTriangle", tone: "danger", value: String(k.overduePayments || 0), labelKey: "billing.kpiOverduePayments" }
      ];
      document.getElementById("billing-payments-kpi-grid").innerHTML = items.map(kpiCardHtml).join("");
    }

    function renderPanelIcons() {
      var invIcon = document.getElementById("invoices-panel-icon");
      var payIcon = document.getElementById("payments-panel-icon");
      if (invIcon && !invIcon.innerHTML) invIcon.innerHTML = panelIcon("creditCard");
      if (payIcon && !payIcon.innerHTML) payIcon.innerHTML = panelIcon("trendingUp");
    }

    function populateInvoiceFilters() {
      var previousStatus = invStatusFilter.value;
      var statusValues = [];
      billingData.invoices.forEach(function (inv) {
        if (inv.status && statusValues.indexOf(inv.status) === -1) statusValues.push(inv.status);
      });
      invStatusFilter.innerHTML =
        '<option value="">' + ns.i18n.t("billing.allInvoiceStatuses") + "</option>" +
        statusValues.map(function (s) { return '<option value="' + s + '">' + s + "</option>"; }).join("");
      invStatusFilter.value = previousStatus;

      if (!invSort.options.length) {
        invSort.innerHTML =
          '<option value="created_desc">' + ns.i18n.t("billing.sortCreatedNewest") + "</option>" +
          '<option value="created_asc">' + ns.i18n.t("billing.sortCreatedOldest") + "</option>" +
          '<option value="total_desc">' + ns.i18n.t("billing.sortAmountHighest") + "</option>" +
          '<option value="total_asc">' + ns.i18n.t("billing.sortAmountLowest") + "</option>";
      }
    }

    function populatePaymentFilters() {
      var previousStatus = payStatusFilter.value;
      var previousClient = payClientFilter.value;
      var previousProject = payProjectFilter.value;
      var statusValues = [];
      var clientNames = [];
      var projectNames = [];
      billingData.payments.forEach(function (p) {
        if (p.status && statusValues.indexOf(p.status) === -1) statusValues.push(p.status);
        if (p.clientName && clientNames.indexOf(p.clientName) === -1) clientNames.push(p.clientName);
        if (p.projectName && projectNames.indexOf(p.projectName) === -1) projectNames.push(p.projectName);
      });
      payStatusFilter.innerHTML =
        '<option value="">' + ns.i18n.t("billing.allPaymentStatuses") + "</option>" +
        statusValues.map(function (s) { return '<option value="' + s + '">' + s + "</option>"; }).join("");
      payClientFilter.innerHTML =
        '<option value="">' + ns.i18n.t("billing.allClients") + "</option>" +
        clientNames.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("");
      payProjectFilter.innerHTML =
        '<option value="">' + ns.i18n.t("billing.allProjects") + "</option>" +
        projectNames.map(function (p) { return '<option value="' + p + '">' + p + "</option>"; }).join("");
      payStatusFilter.value = previousStatus;
      payClientFilter.value = previousClient;
      payProjectFilter.value = previousProject;

      if (!paySort.options.length) {
        paySort.innerHTML =
          '<option value="due_desc">' + ns.i18n.t("billing.sortDueNewest") + "</option>" +
          '<option value="due_asc">' + ns.i18n.t("billing.sortDueOldest") + "</option>" +
          '<option value="amount_desc">' + ns.i18n.t("billing.sortAmountHighest") + "</option>" +
          '<option value="amount_asc">' + ns.i18n.t("billing.sortAmountLowest") + "</option>";
      }
    }

    function matchesInvoiceFilters(inv) {
      var query = invSearch.value.trim().toLowerCase();
      if (query) {
        var number = (inv.invoiceNumber || "").toLowerCase();
        var client = (inv.clientName || "").toLowerCase();
        if (number.indexOf(query) === -1 && client.indexOf(query) === -1) return false;
      }
      if (invStatusFilter.value && inv.status !== invStatusFilter.value) return false;
      return true;
    }

    function sortInvoices(list) {
      var mode = invSort.value || "created_desc";
      var sorted = list.slice();
      sorted.sort(function (a, b) {
        if (mode.indexOf("created") === 0) {
          var dateA = a.created ? new Date(a.created).getTime() : 0;
          var dateB = b.created ? new Date(b.created).getTime() : 0;
          return mode === "created_desc" ? dateB - dateA : dateA - dateB;
        }
        return mode === "total_desc" ? b.total - a.total : a.total - b.total;
      });
      return sorted;
    }

    function matchesPaymentFilters(p) {
      var query = paySearch.value.trim().toLowerCase();
      if (query) {
        var paymentId = (p.paymentId || "").toLowerCase();
        var client = (p.clientName || "").toLowerCase();
        var project = (p.projectName || "").toLowerCase();
        if (paymentId.indexOf(query) === -1 && client.indexOf(query) === -1 && project.indexOf(query) === -1) return false;
      }
      if (payStatusFilter.value && p.status !== payStatusFilter.value) return false;
      if (payClientFilter.value && p.clientName !== payClientFilter.value) return false;
      if (payProjectFilter.value && p.projectName !== payProjectFilter.value) return false;
      if (payDueFrom.value && (!p.dueDate || p.dueDate < payDueFrom.value)) return false;
      if (payDueTo.value && (!p.dueDate || p.dueDate > payDueTo.value)) return false;
      return true;
    }

    function sortPayments(list) {
      var mode = paySort.value || "due_desc";
      var sorted = list.slice();
      sorted.sort(function (a, b) {
        if (mode.indexOf("due") === 0) {
          var dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          var dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return mode === "due_desc" ? dateB - dateA : dateA - dateB;
        }
        return mode === "amount_desc" ? b.amount - a.amount : a.amount - b.amount;
      });
      return sorted;
    }

    function renderInvoicesTable() {
      var host = document.getElementById("invoices-list-body");
      var list = sortInvoices(billingData.invoices.filter(matchesInvoiceFilters));
      var countBadge = document.getElementById("invoices-count-badge");
      if (countBadge) countBadge.textContent = list.length + " " + ns.i18n.t("billing.resultsCount");
      if (list.length === 0) {
        host.innerHTML = stateHtml("empty", panelIcon("creditCard"), ns.i18n.t("billing.emptyInvoicesResults"));
        return;
      }
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("billingFields.invoiceNumber") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.client") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.lead") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.amountBeforeVat") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.vat") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.total") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.status") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.created") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.document") + "</th>" +
        "<th></th>" +
        "</tr>";
      var rows = list
        .map(function (inv) {
          var docCell = inv.pdfUrl
            ? '<a href="' + inv.pdfUrl + '" target="_blank" rel="noopener noreferrer">' + ns.i18n.t("billing.documentLink") + "</a>"
            : ns.i18n.t("billing.noDocument");
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("billingFields.invoiceNumber") + '"><button type="button" class="data-table__primary" data-invoice-open="' + inv.id + '">' + (inv.invoiceNumber || PLACEHOLDER) + "</button></td>" +
            '<td data-label="' + ns.i18n.t("billingFields.client") + '">' + (inv.clientName || PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.lead") + '">' + (inv.leadName || PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.amountBeforeVat") + '">' + ph.formatCurrency(inv.amount) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.vat") + '">' + ph.formatCurrency(inv.vatAmount) + "</td>" +
            '<td class="billing-amount-cell" data-label="' + ns.i18n.t("billingFields.total") + '">' + ph.formatCurrency(inv.total) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.status") + '">' + rawStatusBadge(inv.status) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.created") + '">' + (inv.created ? ph.formatDate(inv.created) : PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.document") + '">' + docCell + "</td>" +
            "<td>" + (!invoiceIsPaid(inv)
              ? '<button type="button" class="btn btn--secondary" data-invoice-update-payment="' + inv.id + '">' + ns.i18n.t("billing.updatePaymentAction") + "</button>"
              : "") +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table billing-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";

      host.querySelectorAll("[data-invoice-open]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var inv = billingData.invoices.filter(function (i) {
            return i.id === btn.getAttribute("data-invoice-open");
          })[0];
          if (inv) openInvoiceDetails(inv);
        });
      });

      host.querySelectorAll("[data-invoice-update-payment]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var inv = billingData.invoices.filter(function (i) {
            return i.id === btn.getAttribute("data-invoice-update-payment");
          })[0];
          if (inv) openUpdatePaymentForm(inv);
        });
      });
    }

    function renderPaymentsTable() {
      var host = document.getElementById("payments-list-body");
      var list = sortPayments(billingData.payments.filter(matchesPaymentFilters));
      var countBadge = document.getElementById("payments-count-badge");
      if (countBadge) countBadge.textContent = list.length + " " + ns.i18n.t("billing.resultsCount");
      if (list.length === 0) {
        host.innerHTML = stateHtml("empty", panelIcon("trendingUp"), ns.i18n.t("billing.emptyPaymentsResults"));
        return;
      }
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("billingFields.paymentId") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.client") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.invoice") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.project") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.paymentType") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.amount") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.status") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.dueDate") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.paidDate") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.notes") + "</th>" +
        "</tr>";
      var today = new Date().toISOString().slice(0, 10);
      var rows = list
        .map(function (p) {
          var projectCell = p.projectId
            ? '<a class="data-table__primary" href="' + ph.projectLink(p.projectId) + '">' + (p.projectName || PLACEHOLDER) + "</a>"
            : (p.projectName || PLACEHOLDER);
          var statusLower = (p.status || "").trim().toLowerCase();
          var isOverdue = statusLower === "overdue" || (statusLower !== "paid" && p.dueDate && p.dueDate < today);
          var rowClass = isOverdue ? ' class="billing-row--danger"' : statusLower === "pending" ? ' class="billing-row--warning"' : "";
          return (
            "<tr" + rowClass + ">" +
            '<td data-label="' + ns.i18n.t("billingFields.paymentId") + '">' + (p.paymentId || PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.client") + '">' + (p.clientName || PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.invoice") + '">' + (p.invoiceNumber || PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.project") + '">' + projectCell + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.paymentType") + '">' + (p.paymentType || PLACEHOLDER) + "</td>" +
            '<td class="billing-amount-cell" data-label="' + ns.i18n.t("billingFields.amount") + '">' + ph.formatCurrency(p.amount) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.status") + '">' + rawStatusBadge(p.status) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.dueDate") + '">' + (p.dueDate ? ph.formatDate(p.dueDate) : PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.paidDate") + '">' + (p.paidDate ? ph.formatDate(p.paidDate) : PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.notes") + '">' + (p.notes || PLACEHOLDER) + "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table billing-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";
    }

    function openInvoiceDetails(inv) {
      var docLine = inv.pdfUrl
        ? '<a href="' + inv.pdfUrl + '" target="_blank" rel="noopener noreferrer">' + ns.i18n.t("billing.documentLink") + "</a>"
        : ns.i18n.t("billing.noDocument");
      var paymentsHtml = inv.payments.length
        ? '<table class="data-table"><thead><tr>' +
          "<th>" + ns.i18n.t("billingFields.paymentId") + "</th>" +
          "<th>" + ns.i18n.t("billingFields.amount") + "</th>" +
          "<th>" + ns.i18n.t("billingFields.status") + "</th>" +
          "<th>" + ns.i18n.t("billingFields.paidDate") + "</th>" +
          "</tr></thead><tbody>" +
          inv.payments
            .map(function (p) {
              return (
                "<tr>" +
                "<td>" + (p.paymentId || PLACEHOLDER) + "</td>" +
                "<td>" + ph.formatCurrency(p.amount) + "</td>" +
                "<td>" + rawStatusBadge(p.status) + "</td>" +
                "<td>" + (p.paidDate ? ph.formatDate(p.paidDate) : PLACEHOLDER) + "</td>" +
                "</tr>"
              );
            })
            .join("") +
          "</tbody></table>"
        : '<p class="panel__empty">' + ns.i18n.t("billing.noPaymentsOnInvoice") + "</p>";

      var body =
        ph.fieldRow("billingFields.client", inv.clientName || PLACEHOLDER) +
        ph.fieldRow("billingFields.lead", inv.leadName || PLACEHOLDER) +
        ph.fieldRow("billingFields.amountBeforeVat", ph.formatCurrency(inv.amount)) +
        ph.fieldRow("billingFields.vat", ph.formatCurrency(inv.vatAmount)) +
        ph.fieldRow("billingFields.total", ph.formatCurrency(inv.total)) +
        ph.fieldRow("billingFields.status", rawStatusBadge(inv.status)) +
        ph.fieldRow("billingFields.created", inv.created ? ph.formatDate(inv.created) : PLACEHOLDER) +
        ph.fieldRow("billingFields.document", docLine) +
        '<p class="note-text"><strong>' + ns.i18n.t("billing.paymentRecordsHeading") + "</strong></p>" +
        paymentsHtml;
      ns.components.modal.open(inv.invoiceNumber || PLACEHOLDER, body);
    }

    /* "ביצוע תשלום" per-invoice action (2026-09-23, rebuilt for the
       Invoice<->Lead integration 2026-09-25) — posts directly to the
       already-live, already-built "payment-via-app-update" n8n webhook
       (js/services/finance-webhooks.js's sendPaymentUpdate()), a separate
       workflow from the Create-Invoice/Record-Payment ones above. Same
       "don't fake the result locally" discipline as pollForInvoiceNumber()
       above: on success this refreshes from GET /api/billing rather than
       patching billingData in place. Only reachable from an Admin session
       — this whole page is already gated to role "admin" by
       window.IQRAA_ROLE + workspace-chrome.js's real, session-verified
       access check (backend/server.js's GET /api/auth/me), not merely by
       this button being hidden from other roles. */
    function openUpdatePaymentForm(inv) {
      /* Defensive: the triggering button (renderInvoicesTable) already
         hides itself once invoiceIsPaid() is true, but billingData can
         have refreshed (e.g. another admin tab) between render and click,
         so this re-checks rather than trusting the caller — this is the
         "prevent accidental duplicate payment requests" guard for an
         already-paid invoice. */
      if (invoiceIsPaid(inv)) {
        ns.components.modal.open(ns.i18n.t("billing.updatePaymentTitle") + " " + (inv.invoiceNumber || PLACEHOLDER), '<p class="note-text">' + ns.i18n.t("billing.updatePaymentAlreadyPaid") + "</p>");
        return;
      }

      var idp = "payment-update-form";
      /* Only "PAID" is meaningful end-to-end (the payment-via-app-update
         n8n workflow sets the Invoice's own Status to whatever is sent
         here, then marks its linked Lead "First payment paid") — no
         status picker, see CLAUDE.md §19e's Admin billing integration
         audit. Method list matches exactly what that workflow's
         Code-validation node accepts. */
      var methodOptions = ["Bank Transfer", "Cash", "Check", "Other"]
        .map(function (m) { return '<option value="' + m + '">' + m + "</option>"; })
        .join("");
      var todayIso = new Date().toISOString().slice(0, 10);

      /* amount_paid is pre-filled from the invoice's own Total (incl. VAT)
         — the workflow no longer touches a separate Payment record with
         its own Amount to copy from, so the invoice's real Total is the
         only meaningful default. Still an editable number field, not
         read-only, in case the admin is recording a different amount. */
      var invoiceInfo =
        ph.fieldRow("billingFields.client", inv.clientName || PLACEHOLDER) +
        ph.fieldRow("billingFields.lead", inv.leadName || PLACEHOLDER) +
        ph.fieldRow("billingFields.total", ph.formatCurrency(inv.total));

      var fields =
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-invoiceId">' + ns.i18n.t("billingFields.invoiceNumber") + "</label>" +
        '<input id="' + idp + '-invoiceId" class="text-field__input" type="text" value="' + (inv.invoiceNumber || "") + '" readonly disabled /></div>' +
        invoiceInfo +
        '<p class="note-text">' + ns.i18n.t("billing.updatePaymentNote") + "</p>" +
        ns.components.textField.render({ id: idp + "-amount", labelI18nKey: "billing.amountPaidLabel", required: true, type: "number" }) +
        ns.components.textField.render({ id: idp + "-paidDate", labelI18nKey: "billing.paidDateLabel", required: true, type: "date" }) +
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-method">' + ns.i18n.t("billing.paymentMethodLabel") + "</label>" +
        '<select id="' + idp + '-method" class="select">' + methodOptions + "</select></div>" +
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-notes">' + ns.i18n.t("billing.notesLabel") + "</label>" +
        '<textarea id="' + idp + '-notes" class="text-field__input" rows="3"></textarea></div>' +
        '<p class="note-text" id="' + idp + '-status-msg" role="status" hidden></p>' +
        '<div class="modal__actions">' +
        '<button type="button" class="btn btn--secondary" id="' + idp + '-cancel">' + ns.i18n.t("leads.cancelButton") + "</button>" +
        '<button type="submit" class="btn btn--primary" id="' + idp + '-submit">' + ns.i18n.t("billing.updatePaymentAction") + "</button>" +
        "</div>" +
        '<p class="note-text" id="' + idp + '-error" role="alert" hidden></p>';
      ns.components.modal.open(ns.i18n.t("billing.updatePaymentTitle") + " " + (inv.invoiceNumber || PLACEHOLDER), '<form id="' + idp + '" novalidate>' + fields + "</form>");

      var amountInput = document.getElementById(idp + "-amount");
      var paidDateInput = document.getElementById(idp + "-paidDate");
      var methodSelect = document.getElementById(idp + "-method");
      var notesInput = document.getElementById(idp + "-notes");
      var submitBtn = document.getElementById(idp + "-submit");
      var cancelBtn = document.getElementById(idp + "-cancel");
      var errorEl = document.getElementById(idp + "-error");
      var statusMsgEl = document.getElementById(idp + "-status-msg");
      var form = document.getElementById(idp);
      var touched = {};

      paidDateInput.value = todayIso;
      amountInput.value = inv.total;

      function validateAmount() {
        if (!touched.amount) return true;
        var raw = amountInput.value.trim();
        var value = Number(raw);
        var error = raw.length === 0 || !isFinite(value) || value <= 0 ? ns.i18n.t("billing.amountInvalid") : "";
        ns.components.textField.setError(amountInput.id, error);
        return !error;
      }

      function validatePaidDate() {
        if (!touched.paidDate) return true;
        var error = paidDateInput.value ? "" : ns.i18n.t("billing.fieldRequired");
        ns.components.textField.setError(paidDateInput.id, error);
        return !error;
      }

      amountInput.addEventListener("blur", function () {
        touched.amount = true;
        validateAmount();
      });
      amountInput.addEventListener("input", function () {
        if (touched.amount) validateAmount();
      });
      paidDateInput.addEventListener("blur", function () {
        touched.paidDate = true;
        validatePaidDate();
      });
      paidDateInput.addEventListener("change", function () {
        touched.paidDate = true;
        validatePaidDate();
      });

      cancelBtn.addEventListener("click", function () {
        ns.components.modal.close();
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        touched = { amount: true, paidDate: true };
        var validAmount = validateAmount();
        var validPaidDate = validatePaidDate();
        if (!validAmount || !validPaidDate) return;

        var payload = {
          invoice_id: inv.invoiceNumber,
          amount_paid: Number(amountInput.value),
          status: "PAID",
          paid_date: paidDateInput.value,
          payment_method: methodSelect.value,
          notes: notesInput.value.trim()
        };

        errorEl.hidden = true;
        setSubmitting(submitBtn, true);
        cancelBtn.disabled = true;

        ns.services.financeWebhooks
          .sendPaymentUpdate(payload)
          .then(function () {
            cancelBtn.disabled = false;
            statusMsgEl.hidden = false;
            statusMsgEl.textContent = ns.i18n.t("billing.updatePaymentSuccess");
            setTimeout(function () {
              ns.components.modal.close();
              loadBilling();
            }, 900);
          })
          .catch(function (error) {
            cancelBtn.disabled = false;
            setSubmitting(submitBtn, false, "billing.updatePaymentAction");
            showActionError(errorEl, error);
          });
      });
    }

    function knownClients() {
      var map = {};
      billingData.invoices.forEach(function (inv) {
        if (inv.clientId) map[inv.clientId] = inv.clientName;
      });
      billingData.payments.forEach(function (p) {
        if (p.clientId) map[p.clientId] = p.clientName;
      });
      return Object.keys(map).map(function (id) {
        return { id: id, name: map[id] };
      });
    }

    function knownProjects() {
      var map = {};
      billingData.payments.forEach(function (p) {
        if (p.projectId) map[p.projectId] = p.projectName;
      });
      return Object.keys(map).map(function (id) {
        return { id: id, name: map[id] };
      });
    }

    function optionsHtml(entries, emptyLabelKey) {
      return (
        '<option value="">' + ns.i18n.t(emptyLabelKey) + "</option>" +
        entries.map(function (e) { return '<option value="' + e.id + '">' + (e.name || e.id) + "</option>"; }).join("")
      );
    }

    function setSubmitting(submitBtn, isSubmitting, idleLabelKey) {
      submitBtn.disabled = isSubmitting;
      submitBtn.innerHTML = isSubmitting
        ? '<span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " + ns.i18n.t("billing.actionSubmitting")
        : ns.i18n.t(idleLabelKey);
    }

    function showActionError(errorEl, error) {
      var text;
      if (error && error.notConfigured) text = ns.i18n.t("billing.notConfigured");
      else if (error && error.timeout) text = ns.i18n.t("billing.actionTimeout");
      else if (error && error.notConfirmed) text = ns.i18n.t("billing.updatePaymentNotConfirmed");
      else text = ns.i18n.t("billing.actionError");
      errorEl.textContent = text;
      errorEl.hidden = false;
    }

    function loadClientsList() {
      if (!ns.services.clientsApi) return Promise.resolve([]);
      return ns.services.clientsApi
        .getClients()
        .then(function (clients) {
          clientsList = clients || [];
          return clientsList;
        })
        .catch(function (err) {
          console.error("[billing] Failed to load clients from the backend:", err);
          clientsList = [];
          return clientsList;
        });
    }

    /* The WF1 webhook responds the instant it's triggered ("Workflow got
       started."), before it has actually looked up the client, created the
       Invoice record, or validated it (see js/services/finance-webhooks.js)
       — so a resolved sendInvoiceAction() promise is not "invoice created".
       This polls the real GET /api/billing data (never trusting the
       submitted form values themselves) until the submitted invoice number
       actually shows up, then refreshes the invoices/payments tables and
       both KPI grids from that same response. Resolves with the found
       invoice, or null if it still hasn't appeared after
       INVOICE_POLL_ATTEMPTS — the caller treats that as "not confirmed
       yet", never as a fake success. */
    function pollForInvoiceNumber(invoiceNumber, attemptsLeft) {
      return api.getBilling().then(function (body) {
        var match = (body.invoices || []).filter(function (inv) {
          return (inv.invoiceNumber || "").trim() === invoiceNumber;
        })[0];
        if (match) {
          billingData = body;
          renderAll();
          return match;
        }
        if (attemptsLeft <= 1) return null;
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(pollForInvoiceNumber(invoiceNumber, attemptsLeft - 1));
          }, INVOICE_POLL_INTERVAL_MS);
        });
      });
    }

    function openCreateInvoiceForm() {
      var idp = "invoice-form";
      var eligibleClients = clientsList.filter(function (c) {
        return !!c.clientCode;
      });
      var clientOptionsHtml = eligibleClients.length
        ? '<option value="">' + ns.i18n.t("billing.selectClientPlaceholder") + "</option>" +
          eligibleClients
            .map(function (c) { return '<option value="' + c.clientCode + '">' + (c.name || c.clientCode) + "</option>"; })
            .join("")
        : '<option value="">' + ns.i18n.t("billing.noClientsAvailable") + "</option>";

      var fields =
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-client">' + ns.i18n.t("billingFields.client") +
        ' <span class="text-field__required" aria-hidden="true">*</span></label>' +
        '<select id="' + idp + '-client" class="select">' + clientOptionsHtml + "</select>" +
        '<span id="' + idp + '-client-error" class="text-field__error" role="alert" hidden></span>' +
        "</div>" +
        ns.components.textField.render({ id: idp + "-number", labelI18nKey: "billing.invoiceNumberLabel", required: true }) +
        ns.components.textField.render({ id: idp + "-amount", labelI18nKey: "billing.amountBeforeVatLabel", required: true, type: "number" }) +
        '<p class="note-text" id="' + idp + '-status" role="status" hidden></p>' +
        '<div class="modal__actions">' +
        '<button type="button" class="btn btn--secondary" id="' + idp + '-cancel">' + ns.i18n.t("leads.cancelButton") + "</button>" +
        '<button type="submit" class="btn btn--primary" id="' + idp + '-submit">' + ns.i18n.t("leads.saveButton") + "</button>" +
        "</div>" +
        '<p class="note-text" id="' + idp + '-error" role="alert" hidden></p>';
      ns.components.modal.open(ns.i18n.t("billing.createInvoiceTitle"), '<form id="' + idp + '" novalidate>' + fields + "</form>");

      var clientSelect = document.getElementById(idp + "-client");
      var clientErrorEl = document.getElementById(idp + "-client-error");
      var numberInput = document.getElementById(idp + "-number");
      var amountInput = document.getElementById(idp + "-amount");
      var submitBtn = document.getElementById(idp + "-submit");
      var cancelBtn = document.getElementById(idp + "-cancel");
      var errorEl = document.getElementById(idp + "-error");
      var statusEl = document.getElementById(idp + "-status");
      var form = document.getElementById(idp);
      var touched = {};

      function setClientError(message) {
        clientErrorEl.textContent = message || "";
        clientErrorEl.hidden = !message;
        clientSelect.classList.toggle("text-field__input--error", !!message);
      }

      function validateClient() {
        if (!touched.client) return true;
        var error = clientSelect.value ? "" : ns.i18n.t("billing.clientRequired");
        setClientError(error);
        return !error;
      }

      function validateNumber() {
        if (!touched.number) return true;
        var error = numberInput.value.trim().length === 0 ? ns.i18n.t("billing.fieldRequired") : "";
        ns.components.textField.setError(numberInput.id, error);
        return !error;
      }

      function validateAmount() {
        if (!touched.amount) return true;
        var raw = amountInput.value.trim();
        var value = Number(raw);
        var error = raw.length === 0 || !isFinite(value) || value <= 0 ? ns.i18n.t("billing.amountInvalid") : "";
        ns.components.textField.setError(amountInput.id, error);
        return !error;
      }

      clientSelect.addEventListener("change", function () {
        touched.client = true;
        validateClient();
      });
      numberInput.addEventListener("blur", function () {
        touched.number = true;
        validateNumber();
      });
      numberInput.addEventListener("input", function () {
        if (touched.number) validateNumber();
      });
      amountInput.addEventListener("blur", function () {
        touched.amount = true;
        validateAmount();
      });
      amountInput.addEventListener("input", function () {
        if (touched.amount) validateAmount();
      });

      cancelBtn.addEventListener("click", function () {
        ns.components.modal.close();
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        touched = { client: true, number: true, amount: true };
        var validClient = validateClient();
        var validNumber = validateNumber();
        var validAmount = validateAmount();
        if (!validClient || !validNumber || !validAmount) return;

        var invoiceNumber = numberInput.value.trim();
        var amount = Number(amountInput.value);
        var clientId = clientSelect.value;

        errorEl.hidden = true;
        statusEl.hidden = false;
        statusEl.textContent = ns.i18n.t("billing.actionProcessing");
        setSubmitting(submitBtn, true);
        cancelBtn.disabled = true;

        webhooks
          .sendInvoiceAction({ invoiceNumber: invoiceNumber, clientId: clientId, amount: amount })
          .then(function () {
            return pollForInvoiceNumber(invoiceNumber, INVOICE_POLL_ATTEMPTS);
          })
          .then(function (createdInvoice) {
            cancelBtn.disabled = false;
            if (createdInvoice) {
              ns.components.modal.close();
              return;
            }
            statusEl.hidden = true;
            setSubmitting(submitBtn, false, "leads.saveButton");
            showActionError(errorEl, { timeout: true });
          })
          .catch(function (error) {
            cancelBtn.disabled = false;
            statusEl.hidden = true;
            setSubmitting(submitBtn, false, "leads.saveButton");
            showActionError(errorEl, error);
          });
      });
    }

    function openCreatePaymentForm() {
      var idp = "payment-form";
      var typeOptions = ["First", "Milestone", "Final"].map(function (t) { return '<option value="' + t + '">' + t + "</option>"; }).join("");
      var statusOptions = ["Pending", "Paid", "Overdue"].map(function (s) { return '<option value="' + s + '">' + s + "</option>"; }).join("");

      var fields =
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-client">' + ns.i18n.t("billingFields.client") + "</label>" +
        '<select id="' + idp + '-client" class="select">' + optionsHtml(knownClients(), "projectFields.unassigned") + "</select></div>" +
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-project">' + ns.i18n.t("billingFields.project") + "</label>" +
        '<select id="' + idp + '-project" class="select">' + optionsHtml(knownProjects(), "projectFields.unassigned") + "</select></div>" +
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-invoice">' + ns.i18n.t("billing.relatedInvoiceLabel") + "</label>" +
        '<select id="' + idp + '-invoice" class="select">' +
        optionsHtml(
          billingData.invoices.map(function (inv) { return { id: inv.id, name: inv.invoiceNumber }; }),
          "billing.noRelatedInvoice"
        ) +
        "</select></div>" +
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-type">' + ns.i18n.t("billing.paymentTypeLabel") + "</label>" +
        '<select id="' + idp + '-type" class="select">' + typeOptions + "</select></div>" +
        ns.components.textField.render({ id: idp + "-amount", labelI18nKey: "billingFields.amount", required: true, type: "number" }) +
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-status">' + ns.i18n.t("billingFields.status") + "</label>" +
        '<select id="' + idp + '-status" class="select">' + statusOptions + "</select></div>" +
        ns.components.textField.render({ id: idp + "-dueDate", labelI18nKey: "billing.dueDateLabel", type: "date" }) +
        ns.components.textField.render({ id: idp + "-paidDate", labelI18nKey: "billing.paidDateLabel", type: "date" }) +
        '<div class="text-field"><label class="text-field__label" for="' + idp + '-notes">' + ns.i18n.t("billing.notesLabel") + "</label>" +
        '<textarea id="' + idp + '-notes" class="text-field__input" rows="3"></textarea></div>' +
        '<div class="modal__actions">' +
        '<button type="button" class="btn btn--secondary" id="' + idp + '-cancel">' + ns.i18n.t("leads.cancelButton") + "</button>" +
        '<button type="submit" class="btn btn--primary" id="' + idp + '-submit">' + ns.i18n.t("leads.saveButton") + "</button>" +
        "</div>" +
        '<p class="note-text" id="' + idp + '-error" role="alert" hidden></p>';
      ns.components.modal.open(ns.i18n.t("billing.recordPaymentTitle"), '<form id="' + idp + '" novalidate>' + fields + "</form>");

      var amountInput = document.getElementById(idp + "-amount");
      var submitBtn = document.getElementById(idp + "-submit");
      var errorEl = document.getElementById(idp + "-error");
      var form = document.getElementById(idp);
      var touched = {};

      function validateAmount() {
        if (!touched.amount) return true;
        var error = amountInput.value.trim().length === 0 ? ns.i18n.t("billing.fieldRequired") : "";
        ns.components.textField.setError(amountInput.id, error);
        return !error;
      }
      amountInput.addEventListener("blur", function () {
        touched.amount = true;
        validateAmount();
      });
      amountInput.addEventListener("input", function () {
        if (touched.amount) validateAmount();
      });

      document.getElementById(idp + "-cancel").addEventListener("click", function () {
        ns.components.modal.close();
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        touched.amount = true;
        if (!validateAmount()) return;

        errorEl.hidden = true;
        setSubmitting(submitBtn, true);

        var clientSelect = document.getElementById(idp + "-client");
        var projectSelect = document.getElementById(idp + "-project");
        var invoiceSelect = document.getElementById(idp + "-invoice");
        var typeSelect = document.getElementById(idp + "-type");
        var statusSelect = document.getElementById(idp + "-status");
        var dueDateInput = document.getElementById(idp + "-dueDate");
        var paidDateInput = document.getElementById(idp + "-paidDate");
        var notesInput = document.getElementById(idp + "-notes");

        webhooks
          .sendPaymentAction("create_payment", {
            clientId: clientSelect.value || null,
            projectId: projectSelect.value || null,
            invoiceId: invoiceSelect.value || null,
            paymentType: typeSelect.value,
            amount: Number(amountInput.value) || 0,
            status: statusSelect.value,
            dueDate: dueDateInput.value || null,
            paidDate: paidDateInput.value || null,
            notes: notesInput.value.trim() || null
          })
          .then(function () {
            ns.components.modal.close();
            loadBilling();
          })
          .catch(function (error) {
            setSubmitting(submitBtn, false, "leads.saveButton");
            showActionError(errorEl, error);
          });
      });
    }

    function renderAll() {
      renderPanelIcons();
      renderInvoicesKpis();
      renderPaymentsKpis();
      populateInvoiceFilters();
      populatePaymentFilters();
      renderInvoicesTable();
      renderPaymentsTable();
    }

    function loadBilling() {
      renderPanelIcons();
      renderLoading();
      api
        .getBilling()
        .then(function (body) {
          billingData = body;
          renderAll();
        })
        .catch(function (err) {
          console.error("[billing] Failed to load billing data from the backend:", err);
          renderError();
        });
    }

    invSearch.addEventListener("input", renderInvoicesTable);
    invStatusFilter.addEventListener("change", renderInvoicesTable);
    invSort.addEventListener("change", renderInvoicesTable);
    invCreateBtn.addEventListener("click", openCreateInvoiceForm);

    paySearch.addEventListener("input", renderPaymentsTable);
    payStatusFilter.addEventListener("change", renderPaymentsTable);
    payClientFilter.addEventListener("change", renderPaymentsTable);
    payProjectFilter.addEventListener("change", renderPaymentsTable);
    payDueFrom.addEventListener("change", renderPaymentsTable);
    payDueTo.addEventListener("change", renderPaymentsTable);
    paySort.addEventListener("change", renderPaymentsTable);
    payCreateBtn.addEventListener("click", openCreatePaymentForm);

    loadBilling();
    loadClientsList();
  });
})(window.IQRAA);
