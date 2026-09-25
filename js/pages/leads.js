/* Leads List + Details (screens.md §7).

   2026-09-22 "Connect Leads to Airtable": this list now renders real
   records from js/services/leads-api.js (GET /api/leads on the existing
   backend, which reads the Airtable Leads table) instead of js/data/
   mock-data.js's data.leads. A fresh fetch runs every time this page
   loads — see loadLeads() below — so changing a lead's Status in
   Airtable and reloading this page reflects the change immediately.

   **Status filter**: the backend already filters server-side to
   LEADS_LIST_STATUSES (see backend/server.js's Leads section — extended
   2026-09-25 to 4 statuses, was "Meeting Booking" only). This file
   re-checks that filter client-side as a defensive second layer per that
   original task's explicit instruction — matchesFilters() below asserts
   lead.status is one of LEADS_LIST_STATUSES in addition to the
   search/status dropdown filters, so a backend bug could never leak an
   unrelated lead onto this page even if the server-side filter were ever
   removed.

   Known scope limits (documented, not bugs): the Leads table has no
   field for product/service interest, assigned-to owner, or a separate
   "last activity" timestamp — the mock data this replaced invented all
   three. Those columns/rows show a placeholder ("—") instead of fake
   data. Create/full-record-Edit are deliberately inert (CLAUDE.md §18's
   external-integration-placeholder pattern) rather than silently
   mutating an in-memory array that would vanish on the next real fetch —
   writing a lead's other fields back to Airtable is still out of scope.

   2026-09-24 "Mark lead as Proccessed", narrowed 2026-09-25 twice —
   first to "Waiting for first payment / First payment paid", then to
   just ONE manual transition once the rest turned out to already be
   automated (see advanceLeadStatus() below and backend/README.md's Leads
   endpoints section for why this is a direct backend PATCH rather than an
   n8n webhook). This page's one real write is now Meeting Booking ->
   Waiting for first payment — nothing past that is ever set from here:
   Invoices carries a real "Lead ID" link (added directly in Airtable),
   and the already-live "payment-via-app-update" n8n workflow
   (js/services/finance-webhooks.js) sets a paid Invoice's linked Lead to
   "First payment paid" itself once an Admin completes payment on it
   through Billing (pages/billing.html) — this page only navigates there,
   it never calls that webhook. A separate, already-existing SCHEDULED n8n
   workflow (not called from here) then creates the Customer + Project and
   sets the lead to Proccessed. GUIDANCE_BY_STATUS below renders a
   per-status explanation panel (2026-09-25 "Update Lead -> First Payment
   flow") so an Admin never has to remember which step comes next or who's
   responsible for it. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  document.addEventListener("DOMContentLoaded", function () {
    var ph = ns.services.projectHelpers;
    var api = ns.services.leadsApi;
    if (!ph || !api) return;

    var LEADS_LIST_STATUSES = ["Meeting Booking", "Waiting for first payment", "First payment paid", "Proccessed"];
    /* The only status this screen ever advances a lead to via the PATCH
       endpoint. Nothing past "Waiting for first payment" is set from
       here — see the file header comment for why. */
    var LEADS_NEXT_STATUS = {
      "Meeting Booking": "Waiting for first payment"
    };
    var PLACEHOLDER = "—";

    /* Per-status Admin guidance (2026-09-25 "Update Lead -> First Payment
       flow") — one explanation of what this status means and what happens
       next, shown in the lead-details modal, so an Admin never has to
       remember the process by heart. "cta" is optional: when present it's
       rendered as a real navigation link (billing.html for "Waiting for
       first payment"), never a status-changing action — only the
       "Meeting Booking" row's own advance button changes a Status from
       this page. */
    var GUIDANCE_BY_STATUS = {
      "Meeting Booking": { titleKey: "leads.guidanceMeetingBookingTitle", bodyKey: "leads.guidanceMeetingBookingBody" },
      "Waiting for first payment": { titleKey: "leads.guidanceWaitingPaymentTitle", bodyKey: "leads.guidanceWaitingPaymentBody", cta: "billing" },
      "First payment paid": { titleKey: "leads.guidanceFirstPaymentPaidTitle", bodyKey: "leads.guidanceFirstPaymentPaidBody" },
      Proccessed: { titleKey: "leads.guidanceProcessedTitle", bodyKey: "leads.guidanceProcessedBody", showInvoice: true }
    };

    var searchInput = document.getElementById("leads-search");
    var statusSelect = document.getElementById("leads-filter-status");
    var createBtn = document.getElementById("leads-create-btn");

    var allLeads = [];

    function renderLoading() {
      document.getElementById("leads-list-body").innerHTML =
        '<p class="panel__empty"><span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(16) + "</span> " +
        ns.i18n.t("leads.loading") +
        "</p>";
    }

    function renderError() {
      document.getElementById("leads-list-body").innerHTML =
        '<div class="panel__empty">' +
        "<p>" + ns.i18n.t("leads.loadError") + "</p>" +
        '<button type="button" class="btn btn--secondary" id="leads-retry-btn">' + ns.i18n.t("leads.retry") + "</button>" +
        "</div>";
      var retryBtn = document.getElementById("leads-retry-btn");
      if (retryBtn) retryBtn.addEventListener("click", loadLeads);
    }

    function populateFilters() {
      var previous = statusSelect.value;
      var statusValues = [];
      allLeads.forEach(function (lead) {
        if (lead.status && statusValues.indexOf(lead.status) === -1) statusValues.push(lead.status);
      });
      var statusOptions = statusValues
        .map(function (statusLabelText) {
          return '<option value="' + statusLabelText + '">' + statusLabelText + "</option>";
        })
        .join("");
      statusSelect.innerHTML = '<option value="">' + ns.i18n.t("leads.allStatuses") + "</option>" + statusOptions;
      statusSelect.value = previous;
    }

    /* Defensive client-side check (see file-header comment) on top of
       the search/status-dropdown filters a viewer can apply. */
    function matchesFilters(lead) {
      if (LEADS_LIST_STATUSES.indexOf(lead.status) === -1) return false;
      var query = searchInput.value.trim().toLowerCase();
      if (query) {
        var name = (lead.name || "").toLowerCase();
        var org = (lead.org || "").toLowerCase();
        if (name.indexOf(query) === -1 && org.indexOf(query) === -1) return false;
      }
      if (statusSelect.value !== "" && lead.status !== statusSelect.value) return false;
      return true;
    }

    /* Action-column content for a lead's row, driven entirely by its
       current Status — mirrors GUIDANCE_BY_STATUS's per-status shape but
       as a compact row-level control rather than the modal's full
       explanation: "Meeting Booking" gets the one real status-advance
       button this page has; "Waiting for first payment" gets a plain
       navigation link to Billing (no fetch, no status change — creating
       the invoice there is what actually moves this lead forward, per the
       payment-via-app-update automation described in the file header);
       "First payment paid"/"Proccessed" get a short informational note
       only, since neither is ever set from this page. */
    function actionCellHtml(lead) {
      var nextStatus = LEADS_NEXT_STATUS[lead.status];
      if (nextStatus) {
        return '<button type="button" class="btn btn--secondary" data-advance-status="' + lead.id + '">' + ns.i18n.t("leads.markWaitingPaymentAction") + "</button>";
      }
      if (lead.status === "Waiting for first payment") {
        return '<a class="btn btn--secondary" href="billing.html">' + ns.i18n.t("leads.goToBillingAction") + "</a>";
      }
      if (lead.status === "First payment paid") {
        return '<span class="note-text">' + ns.i18n.t("leads.waitingForAutomationNote") + "</span>";
      }
      if (lead.status === "Proccessed") {
        return '<span class="note-text">' + ns.i18n.t("leads.completedNote") + "</span>";
      }
      return "";
    }

    function renderTable() {
      var host = document.getElementById("leads-list-body");
      var leads = allLeads.filter(matchesFilters);
      if (leads.length === 0) {
        host.innerHTML = '<p class="panel__empty">' + ns.i18n.t("leads.emptyResults") + "</p>";
        return;
      }
      var head =
        "<tr>" +
        "<th>" + ns.i18n.t("leadFields.name") + "</th>" +
        "<th>" + ns.i18n.t("leadFields.org") + "</th>" +
        "<th>" + ns.i18n.t("leadFields.service") + "</th>" +
        "<th>" + ns.i18n.t("leadFields.status") + "</th>" +
        "<th>" + ns.i18n.t("leadFields.assignedTo") + "</th>" +
        "<th>" + ns.i18n.t("leadFields.lastActivity") + "</th>" +
        "<th></th>" +
        "</tr>";
      var rows = leads
        .map(function (lead) {
          var actionCell = actionCellHtml(lead);
          return (
            "<tr>" +
            '<td data-label="' + ns.i18n.t("leadFields.name") + '"><button type="button" class="data-table__primary" data-lead-open="' + lead.id + '">' + (lead.name || PLACEHOLDER) + "</button></td>" +
            '<td data-label="' + ns.i18n.t("leadFields.org") + '">' + (lead.org || PLACEHOLDER) + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.service") + '">' + PLACEHOLDER + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.status") + '">' + ph.badge(lead.status || PLACEHOLDER, "info") + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.assignedTo") + '">' + ns.i18n.t("projectFields.unassigned") + "</td>" +
            '<td data-label="' + ns.i18n.t("leadFields.lastActivity") + '">' + PLACEHOLDER + "</td>" +
            "<td>" + actionCell + "</td>" +
            "</tr>"
          );
        })
        .join("");
      host.innerHTML = '<table class="data-table"><thead>' + head + "</thead><tbody>" + rows + "</tbody></table>";

      host.querySelectorAll("[data-lead-open]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var lead = allLeads.filter(function (l) {
            return l.id === btn.getAttribute("data-lead-open");
          })[0];
          if (lead) openLeadDetails(lead);
        });
      });

      host.querySelectorAll("[data-advance-status]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var lead = allLeads.filter(function (l) {
            return l.id === btn.getAttribute("data-advance-status");
          })[0];
          if (lead) advanceLeadStatus(lead, btn, document.getElementById("leads-action-status"));
        });
      });
    }

    function showStatus(el, message) {
      if (!el) return;
      el.textContent = message;
      el.hidden = !message;
    }

    /* The only write this screen has — see backend/README.md's Leads
       endpoints section for why this is a direct backend PATCH rather
       than an n8n webhook. Only ever called for "Meeting Booking" ->
       "Waiting for first payment" now (LEADS_NEXT_STATUS has exactly one
       entry); every later transition is made outside the app (see the
       file header comment), so this function has nothing left to do for
       any other status and returns early.

       Called from either the table row's button (statusEl = the panel's
       shared status line) or the details modal's button (statusEl = a
       status line inside the modal itself, since the panel's own status
       line sits behind the modal overlay and would be invisible while
       it's open) — the modal only closes on confirmed success, never
       preemptively, so an error from the modal stays visible right there. */
    function advanceLeadStatus(lead, btn, statusEl) {
      var nextStatus = LEADS_NEXT_STATUS[lead.status];
      if (!nextStatus) return;

      btn.disabled = true;
      var idleLabel = btn.innerHTML;
      btn.innerHTML = '<span class="btn__spinner" aria-hidden="true">' + ns.icons.loader2(14) + "</span> " + ns.i18n.t("leads.statusUpdateSubmitting");
      showStatus(statusEl, "");

      api
        .updateLeadStatus(lead.id, nextStatus)
        .then(function () {
          lead.status = nextStatus;
          if (ns.components.modal.isOpen()) ns.components.modal.close();
          renderTable();
        })
        .catch(function (err) {
          console.error("[leads] Failed to update lead status:", err);
          btn.disabled = false;
          btn.innerHTML = idleLabel;
          showStatus(statusEl, ns.i18n.t("leads.statusUpdateError"));
        });
    }

    function fieldRow(labelKey, valueText) {
      return (
        '<div class="field-row">' +
        '<span class="field-row__label">' + ns.i18n.t(labelKey) + "</span>" +
        '<span class="field-row__value">' + valueText + "</span>" +
        "</div>"
      );
    }

    /* Renders the linked Invoice's summary (GUIDANCE_BY_STATUS's
       showInvoice:true, only ever shown for "Proccessed") — server-resolved
       via GET /api/leads's lead.invoice (backend/server.js's
       resolveLeadInvoices()). Empty string if no invoice is linked, rather
       than a misleading placeholder row, since that's a real "nothing to
       show yet" state, not missing data. */
    function invoiceInfoHtml(lead) {
      if (!lead.invoice) return "";
      var docLine = lead.invoice.pdfUrl
        ? '<a href="' + lead.invoice.pdfUrl + '" target="_blank" rel="noopener">' + ns.i18n.t("leads.invoiceViewDocument") + "</a>"
        : ns.i18n.t("leads.invoiceNoDocument");
      return (
        fieldRow("leads.invoiceRefLabel", lead.invoice.invoiceNumber || PLACEHOLDER) +
        fieldRow("leads.invoiceClientLabel", lead.invoice.clientName || PLACEHOLDER) +
        fieldRow("leads.invoiceTotalLabel", ph.formatCurrency(lead.invoice.total)) +
        fieldRow("leads.invoiceDocumentLabel", docLine)
      );
    }

    /* Per-status Admin guidance panel (GUIDANCE_BY_STATUS) — title + body
       explaining this status and what happens next, a CTA link to Billing
       for "Waiting for first payment" (navigation only, never a status
       change from here), and the linked invoice summary for "Proccessed". */
    function guidancePanelHtml(lead) {
      var guidance = GUIDANCE_BY_STATUS[lead.status];
      if (!guidance) return "";
      return (
        "<p><strong>" + ns.i18n.t(guidance.titleKey) + "</strong></p>" +
        '<p class="note-text">' + ns.i18n.t(guidance.bodyKey) + "</p>" +
        (guidance.cta === "billing" ? '<p><a class="btn btn--secondary" href="billing.html">' + ns.i18n.t("leads.goToBillingAction") + "</a></p>" : "") +
        (guidance.showInvoice ? invoiceInfoHtml(lead) : "")
      );
    }

    function openLeadDetails(lead) {
      var nextStatus = LEADS_NEXT_STATUS[lead.status];
      var body =
        fieldRow("leadFields.org", lead.org || PLACEHOLDER) +
        fieldRow("leadFields.email", lead.email || PLACEHOLDER) +
        fieldRow("leadFields.phone", lead.phone || PLACEHOLDER) +
        fieldRow("leadFields.status", ph.badge(lead.status || PLACEHOLDER, "info")) +
        fieldRow("leadFields.created", lead.created ? ph.formatDate(lead.created.slice(0, 10)) : PLACEHOLDER) +
        fieldRow("leads.messageLabel", lead.message || PLACEHOLDER) +
        guidancePanelHtml(lead) +
        (nextStatus
          ? '<div class="modal__actions modal__actions--start">' +
            '<button type="button" class="btn btn--primary" id="lead-modal-advance-status">' + ns.i18n.t("leads.markWaitingPaymentAction") + "</button>" +
            "</div>" +
            '<p class="note-text" id="lead-modal-status" role="alert" hidden></p>'
          : "") +
        '<p class="note-text">' + ns.i18n.t("leads.writeNotConnected") + "</p>";
      ns.components.modal.open(lead.name || PLACEHOLDER, body);

      var modalBtn = document.getElementById("lead-modal-advance-status");
      if (modalBtn) {
        modalBtn.addEventListener("click", function () {
          advanceLeadStatus(lead, modalBtn, document.getElementById("lead-modal-status"));
        });
      }
    }

    function loadLeads() {
      renderLoading();
      api
        .getLeads()
        .then(function (leads) {
          allLeads = leads;
          populateFilters();
          renderTable();
        })
        .catch(function (err) {
          console.error("[leads] Failed to load leads from the backend:", err);
          renderError();
        });
    }

    searchInput.addEventListener("input", renderTable);
    statusSelect.addEventListener("change", renderTable);
    createBtn.addEventListener("click", function () {
      ns.components.modal.open(ns.i18n.t("leads.createTitle"), '<p class="note-text">' + ns.i18n.t("leads.writeNotConnected") + "</p>");
    });

    loadLeads();
  });
})(window.IQRAA);
