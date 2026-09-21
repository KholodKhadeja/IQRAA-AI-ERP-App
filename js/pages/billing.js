/* Billing Overview + Payments (screens.md §19).

   2026-09-22d "Connect Billing to Airtable": this screen now renders real
   records from js/services/billing-api.js (GET /api/billing on the
   existing backend, Admin-only — see backend/server.js) instead of
   js/data/mock-data.js's data.projects/ph.billingTotals(). A fresh fetch
   runs every time this page loads — see billing-api.js.

   Row unit changed from "one row per project" (the old mock shape, which
   had ready-made totalValue/received/invoiceDueDate fields on each mock
   project) to "one row per Payment" — the real Payments table is the
   actual billable line item, and Projects/Clients in Airtable carry no
   such totals. Total Value/Received/Remaining columns are all derived
   from that single payment's own Amount + Status; Invoice Status comes
   from the linked Invoice record's own Status field. See backend/
   server.js's "Billing" section for the full field-mapping rationale. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.billingApi;
    if (!ph || !api) return;

    var PLACEHOLDER = "—";
    var INVOICE_STATUS_TONE = { paid: "success", pending: "warning", overdue: "danger" };

    var billingData = null;

    function kpiIcon(name) {
      return '<span class="kpi-card__icon" aria-hidden="true">' + ns.icons[name](20) + "</span>";
    }

    function renderLoading() {
      document.getElementById("billing-kpi-grid").innerHTML = "";
      document.getElementById("billing-list-body").innerHTML =
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
        ns.i18n.t("billing.loading") +
        "</p>";
    }

    function renderError() {
      document.getElementById("billing-kpi-grid").innerHTML = "";
      document.getElementById("billing-list-body").innerHTML =
        '<div class="panel__empty">' +
        "<p>" + ns.i18n.t("billing.loadError") + "</p>" +
        '<button type="button" class="btn btn--secondary" id="billing-retry-btn">' + ns.i18n.t("billing.retry") + "</button>" +
        "</div>";
      var retryBtn = document.getElementById("billing-retry-btn");
      if (retryBtn) retryBtn.addEventListener("click", loadBilling);
    }

    function renderKpis() {
      var kpis = billingData.kpis;
      var items = [
        { icon: "creditCard", value: ph.formatCurrency(kpis.totalValue), labelKey: "billing.kpiTotalValue" },
        { icon: "check", value: ph.formatCurrency(kpis.received), labelKey: "billing.kpiReceived" },
        { icon: "clock", value: ph.formatCurrency(kpis.pending), labelKey: "billing.kpiPending" },
        { icon: "alertTriangle", value: ph.formatCurrency(kpis.overdueAmount), labelKey: "billing.kpiOverdue" }
      ];
      document.getElementById("billing-kpi-grid").innerHTML = items
        .map(function (item) {
          return (
            '<div class="kpi-card">' +
            kpiIcon(item.icon) +
            '<span class="kpi-card__value">' + item.value + "</span>" +
            '<span class="kpi-card__label">' + ns.i18n.t(item.labelKey) + "</span>" +
            "</div>"
          );
        })
        .join("") + '<div class="kpi-card"><span class="kpi-card__value">' + kpis.awaitingPaymentProjects + "</span>" +
        '<span class="kpi-card__label">' + ns.i18n.t("billing.kpiAwaitingPayment") + "</span></div>";
    }

    function invoiceStatusBadge(payment) {
      var key = (payment.invoiceStatus || "").trim().toLowerCase();
      if (INVOICE_STATUS_TONE[key]) {
        return ph.badge(ns.i18n.t("invoiceStatus." + key), INVOICE_STATUS_TONE[key]);
      }
      return ph.badge(payment.invoiceStatus || PLACEHOLDER, "neutral");
    }

    function renderTable() {
      var host = document.getElementById("billing-list-body");
      var payments = billingData.payments;
      if (payments.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("billing.emptyResults") + "</p>";
        return;
      }
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("projectFields.project") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.client") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.totalValue") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.received") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.remaining") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.invoiceStatus") + "</th>" +
        "</tr>";
      var rows = payments
        .map(function (p) {
          var received = p.status === "Paid" ? p.amount : 0;
          var remaining = p.status === "Paid" ? 0 : p.amount;
          var projectCell = p.projectId
            ? '<a class="data-table__primary" href="' + ph.projectLink(p.projectId) + '">' + (p.projectName || PLACEHOLDER) + "</a>"
            : (p.projectName || PLACEHOLDER);
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("projectFields.project") + '">' + projectCell + "</td>" +
            '<td data-label="' + ns.i18n.t("projectFields.client") + '">' + (p.clientName || PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.totalValue") + '">' + ph.formatCurrency(p.amount) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.received") + '">' + ph.formatCurrency(received) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.remaining") + '">' + ph.formatCurrency(remaining) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.invoiceStatus") + '">' + invoiceStatusBadge(p) + "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";
    }

    function renderAll() {
      renderKpis();
      renderTable();
    }

    function loadBilling() {
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

    loadBilling();
  });
})(window.IQRAA);
