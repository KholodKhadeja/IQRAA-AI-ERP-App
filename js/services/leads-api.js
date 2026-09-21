/* Thin client for the real, Airtable-backed Leads endpoint (2026-09-22
   "Connect Leads to Airtable"). Same external-integration-placeholder
   convention as js/services/projects-api.js/users-api.js/auth.js
   (CLAUDE.md §18): one named constant for the backend origin.

     pages/leads.html
       -> GET /api/leads on this backend (credentials:"include", a
          session is required — see backend/server.js)
       -> backend reads the Leads table from Airtable, filtered to
          Status = "Meeting Booking" server-side, and returns JSON
       -> Airtable Leads table (base appFUvcg5tY2Dup8U, table tbloeMHPaOzQSypPb)

   Deliberately uncached: getLeads() issues a fresh network request every
   time it's called — leads.html calls it anew on every page load, so
   changing a lead's Status in Airtable and reloading the page reflects
   the change (a lead that's no longer "Meeting Booking" disappears; one
   that just became "Meeting Booking" appears). */
window.IQRAA = window.IQRAA || {};
IQRAA.services = IQRAA.services || {};

IQRAA.services.leadsApi = (function () {
  /* Local dev (or file://) hits the local backend; the deployed static
     site hits the deployed backend service (render.yaml) — see
     js/services/auth.js for why this can't stay a plain hardcoded
     localhost URL once the site is actually deployed. */
  var LEADS_API_BASE = /^(localhost|127\.0\.0\.1)?$/.test(window.location.hostname)
    ? "http://localhost:3001"
    : "https://iqraa-erp-backend.onrender.com";

  function getLeads() {
    return fetch(LEADS_API_BASE + "/api/leads", {
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
          return (body && body.leads) || [];
        });
    });
  }

  return { getLeads: getLeads };
})();
