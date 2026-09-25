/* Write-action config point for Invoices/Payments (Admin financial
   management audit, 2026-09-22; invoice side wired 2026-09-23).

   CLAUDE.md §19: sensitive/write operations go through n8n webhooks,
   called directly from the browser, never through backend/server.js (same
   shape as N8N_LEAD_WEBHOOK_URL in js/pages/landing.js).

   INVOICE_N8N_WEBHOOK_URL is the real, already-built "IQRAA - Invoice
   Validation & Preparation (WF1)" n8n workflow's production webhook URL
   (confirmed live via the n8n API, not guessed — the workflow's own
   editor is at https://kholod-khadeja.app.n8n.cloud/workflow/RRa3OH3hcHw4YPr7,
   which is NOT an API endpoint; its webhook trigger node's registered
   production URL is the one below). That workflow: receives the POST body
   directly (no action/payload envelope — its nodes read
   `$json.body.invoiceNumber` / `.clientId` / `.amount`), looks the client
   up in Airtable by the exact `clientId` text (Clients' own primary
   "Client ID" field, e.g. "CLI-001" — see backend/server.js's
   mapClientSummary()), creates the Invoice record (Status "New"),
   computes VatAmount (18%) and validates it server-side in n8n, then sets
   Status to "Validated" or "Invalid". Total is an Airtable formula field
   (Amount + VatAmount), so it updates itself once VatAmount is written.

   The webhook responds immediately once triggered ("Workflow got
   started.") — it does NOT wait for the Airtable writes/validation to
   finish, so a resolved sendInvoiceAction() promise only means the
   workflow was handed the request, not that the invoice was actually
   created/validated. js/pages/billing.js accounts for this: after the
   promise resolves it polls GET /api/billing for the submitted invoice
   number to actually appear before ever showing a success state, per
   this task's explicit "do not show success before the workflow actually
   succeeds" requirement.

   PAYMENT_N8N_WEBHOOK_URL has no equivalent workflow yet (confirmed live
   — n8n has no Payment-processing workflow) and stays an empty,
   named placeholder per CLAUDE.md §18's external-integration-placeholder
   convention: pages/billing.html's "Record Payment" form shows a
   translated "not configured yet" message rather than a fake success.

   PAYMENT_UPDATE_N8N_WEBHOOK_URL (added 2026-09-23, "ביצוע תשלום" per-
   invoice action, workflow rebuilt 2026-09-25) is a separate, already-
   built, already-live n8n workflow ("payment-via-app-update") — distinct
   from PAYMENT_N8N_WEBHOOK_URL above, which stays untouched. Its webhook
   trigger reads the POST body directly (no action/payload envelope),
   expecting exactly:
     { invoice_id, amount_paid, status, paid_date, payment_method, notes }
   invoice_id is the Invoice's own InvoiceNumber text (e.g. "INV-2026-002",
   the same value billing.js already renders as the invoice's primary
   column / GET /api/billing's invoiceNumber) — never an Airtable record
   id. status is always sent as "PAID" (js/pages/billing.js's only caller
   of this).

   **2026-09-25 rebuild, confirmed live by reading the workflow's own node
   graph before wiring this up**: the workflow no longer searches for or
   touches any Payment record at all (the previous version's "find the
   invoice's linked Payment and update it" logic — and the matching
   eligiblePaymentForInvoice() gate that used to live in billing.js — is
   gone). It now: finds the Invoice by invoice_id -> sets that Invoice's
   own free-text Status field to the "status" value sent above (i.e.
   "PAID") -> reads that same Invoice record's real "Lead ID" linked-record
   field (added directly in Airtable, not by this app) -> sets the linked
   Lead's Status to "First payment paid" -> responds success. An invoice
   with no Lead linked has nothing for that last step to update against,
   so the workflow run fails and this never reaches a success response —
   sendPaymentUpdate() below already treats anything short of an explicit
   success:true as a failure, so that surfaces as a normal error, not a
   fake success. Same "responds once triggered, doesn't wait for the
   Airtable write" caveat as INVOICE_N8N_WEBHOOK_URL above; js/pages/
   billing.js refreshes GET /api/billing after a short delay rather than
   faking the updated row locally. */
window.IQRAA = window.IQRAA || {};
IQRAA.services = IQRAA.services || {};

IQRAA.services.financeWebhooks = (function () {
  var INVOICE_N8N_WEBHOOK_URL = "https://kholod-khadeja.app.n8n.cloud/webhook/create-invoice-via-app";
  var PAYMENT_N8N_WEBHOOK_URL = "";
  var PAYMENT_UPDATE_N8N_WEBHOOK_URL = "https://kholod-khadeja.app.n8n.cloud/webhook/payment-via-app-update";

  function postJson(webhookUrl, body) {
    if (!webhookUrl) {
      var notConfiguredError = new Error("Webhook not configured");
      notConfiguredError.notConfigured = true;
      return Promise.reject(notConfiguredError);
    }
    return fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (responseBody) {
          if (!response.ok) {
            var error = new Error((responseBody && responseBody.error) || "Webhook request failed with status " + response.status);
            error.status = response.status;
            error.body = responseBody;
            throw error;
          }
          /* Defense in depth: some of these n8n workflows can return HTTP 200
             with { success:false } or { valid:false, errors:[...] } on a
             validation failure (a real gap found in the payment-update
             workflow, 2026-09-24 audit) — never treat that as success just
             because the HTTP status was OK. */
          if (responseBody && (responseBody.success === false || responseBody.valid === false)) {
            var validationError = new Error((responseBody.errors && responseBody.errors.join(", ")) || responseBody.message || "Webhook reported failure");
            validationError.status = response.status;
            validationError.body = responseBody;
            throw validationError;
          }
          return responseBody;
        });
    });
  }

  /* payload: { invoiceNumber, clientId, amount } — the exact top-level
     body shape the WF1 webhook trigger reads (no action/payload wrapper,
     see the file comment above). clientId must be the Client's real
     "Client ID" text (js/pages/billing.js sources it from
     GET /api/clients' clientCode, never a raw Airtable record id). */
  function sendInvoiceAction(payload) {
    return postJson(INVOICE_N8N_WEBHOOK_URL, payload);
  }

  function sendPaymentAction(action, payload) {
    return postJson(PAYMENT_N8N_WEBHOOK_URL, { action: action, payload: payload });
  }

  /* payload: { invoice_id, amount_paid, status, paid_date, payment_method,
     notes } — the exact top-level body the payment-update webhook trigger
     reads, no envelope. See the file comment above.

     Requires body.success === true explicitly, stricter than postJson's
     own default (which only rejects an explicit success:false/valid:false
     and otherwise resolves). This was hardened 2026-09-24 against the
     PREVIOUS version of this workflow, whose "Search payments" step could
     find nothing to update and never reach its success-responding node,
     while n8n still answered with a 200 whose body had no success:false
     either — the app showed a false "success" message while nothing was
     ever written to Airtable. The check is kept unchanged after the
     2026-09-25 rebuild (see the file comment above) because the same risk
     exists in a different shape now: an invoice with no linked Lead makes
     the workflow's Lead-update step fail, so the run never reaches its
     success response either — this still needs to surface as a real
     error, never a fake success. */
  function sendPaymentUpdate(payload) {
    return postJson(PAYMENT_UPDATE_N8N_WEBHOOK_URL, payload).then(function (body) {
      if (!body || body.success !== true) {
        var error = new Error("Webhook did not confirm the payment update");
        error.body = body;
        error.notConfirmed = true;
        throw error;
      }
      return body;
    });
  }

  return { sendInvoiceAction: sendInvoiceAction, sendPaymentAction: sendPaymentAction, sendPaymentUpdate: sendPaymentUpdate };
})();
