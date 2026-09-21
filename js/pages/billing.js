/* Billing Overview + Payments (screens.md §19). Totals come from
   ph.billingTotals(), the same computation Admin Overview's "Outstanding
   Payments" KPI uses, so the two screens can't disagree (CLAUDE.md §9).
   The "first payment received → Ready to Start" business rule (CLAUDE.md
   §10) is already enforced in js/pages/dashboard-admin.js's "assign PM"
   flow — this screen just makes each project's payment state visible,
   it doesn't re-implement that rule. */
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
      var totals = ph.billingTotals();
      var awaitingPayment = data.projects.filter(function (p) {
        return (p.received || 0) < (p.totalValue || 0);
      }).length;
      var items = [
        { icon: "creditCard", value: ph.formatCurrency(totals.totalValue), labelKey: "billing.kpiTotalValue" },
        { icon: "check", value: ph.formatCurrency(totals.received), labelKey: "billing.kpiReceived" },
        { icon: "clock", value: ph.formatCurrency(totals.pending), labelKey: "billing.kpiPending" },
        { icon: "alertTriangle", value: ph.formatCurrency(totals.overdueAmount), labelKey: "billing.kpiOverdue" }
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
        .join("") + '<div class="kpi-card"><span class="kpi-card__value">' + awaitingPayment + "</span>" +
        '<span class="kpi-card__label">' + ns.i18n.t("billing.kpiAwaitingPayment") + "</span></div>";
    }

    function renderTable() {
      var host = document.getElementById("billing-list-body");
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("projectFields.project") + "</th>" +
        "<th>" + ns.i18n.t("projectFields.client") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.totalValue") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.received") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.remaining") + "</th>" +
        "<th>" + ns.i18n.t("billingFields.invoiceStatus") + "</th>" +
        "</tr>";
      var rows = data.projects
        .map(function (p) {
          var remaining = (p.totalValue || 0) - (p.received || 0);
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("projectFields.project") + '"><a class="data-table__primary" href="' + ph.projectLink(p.id) + '">' + p.name + "</a></td>" +
            '<td data-label="' + ns.i18n.t("projectFields.client") + '">' + ph.clientName(p.clientId) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.totalValue") + '">' + ph.formatCurrency(p.totalValue || 0) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.received") + '">' + ph.formatCurrency(p.received || 0) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.remaining") + '">' + ph.formatCurrency(remaining) + "</td>" +
            '<td data-label="' + ns.i18n.t("billingFields.invoiceStatus") + '">' + ph.invoiceStatusBadge(p) + "</td>" +
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

    renderAll();
  });
})(window.IQRAA);
