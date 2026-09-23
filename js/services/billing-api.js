/* Thin client for the real, Airtable-backed Billing endpoint (2026-09-22d
   "Connect Billing to Airtable"). Same external-integration-placeholder
   convention as the other *-api.js services (CLAUDE.md §18): one named
   constant for the backend origin, swapping in the real deployed backend
   URL later is a one-line change.

     pages/billing.html
       -> GET /api/billing on this backend (credentials:"include", an
          authenticated Admin session is required — see backend/server.js)
       -> backend reads Payments/Invoices/Projects/Clients from Airtable,
          joins and aggregates them server-side, and returns one JSON
          summary
       -> Airtable base appFUvcg5tY2Dup8U

   Deliberately uncached: getBilling() issues a fresh network request every
   time it's called — billing.html calls it anew on every page load, so
   changing a record in Airtable and reloading the page reflects the
   change immediately. */
window.IQRAA = window.IQRAA || {};
IQRAA.services = IQRAA.services || {};

IQRAA.services.billingApi = (function () {
  /* Local dev (or file://) hits the local backend; the deployed static
     site hits the deployed backend service (render.yaml) — see
     js/services/auth.js for why this can't stay a plain hardcoded
     localhost URL once the site is actually deployed. */
  var BILLING_API_BASE = /^(localhost|127\.0\.0\.1)?$/.test(window.location.hostname)
    ? "http://localhost:3001"
    : "https://iqraa-app-backend.onrender.com";

  function getBilling() {
    return fetch(BILLING_API_BASE + "/api/billing", {
      credentials: "include"
    }).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (body) {
          if (!response.ok) {
            var error = new Error((body && body.error) || "Request failed with status " + response.status);
            error.status = response.status;
            error.body = body;
            throw error;
          }
          return body;
        });
    });
  }

  return { getBilling: getBilling };
})();
