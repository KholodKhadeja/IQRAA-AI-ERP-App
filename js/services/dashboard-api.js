/* Thin client for the real, Airtable-backed Admin/PM Dashboard endpoints
   (2026-09-22 "Connect Admin Dashboard to Airtable", extended 2026-09-22c
   "Connect PM Dashboard to Airtable"). Same external-integration-
   placeholder convention as js/services/projects-api.js/leads-api.js/
   auth.js (CLAUDE.md §18): one named constant for the backend origin,
   swapping in the real deployed backend URL later is a one-line change.

     pages/dashboard-admin.html
       -> GET /api/dashboard/admin on this backend (credentials:"include",
          an authenticated Admin session is required — see
          backend/server.js)
       -> backend reads Leads/Projects/Tasks/Payments/Users from Airtable,
          joins and aggregates them server-side, and returns one JSON
          summary
       -> Airtable base appFUvcg5tY2Dup8U

     pages/dashboard-pm.html
       -> GET /api/dashboard/pm on this backend (credentials:"include", an
          authenticated PM session is required — the backend identifies
          which PM from the session itself, never from anything the
          frontend sends, see backend/server.js)
       -> backend reads Projects/Tasks/Meetings & Decisions from Airtable,
          filters everything to that PM's own projects server-side, and
          returns one JSON summary
       -> Airtable base appFUvcg5tY2Dup8U

   Deliberately uncached: both getters issue a fresh network request every
   time they're called — each dashboard page calls its getter anew on
   every page load, so changing a record in Airtable and reloading the
   page reflects the change immediately. */
window.IQRAA = window.IQRAA || {};
IQRAA.services = IQRAA.services || {};

IQRAA.services.dashboardApi = (function () {
  /* Local dev (or file://) hits the local backend; the deployed static
     site hits the deployed backend service (render.yaml) — see
     js/services/auth.js for why this can't stay a plain hardcoded
     localhost URL once the site is actually deployed. */
  var DASHBOARD_API_BASE = /^(localhost|127\.0\.0\.1)?$/.test(window.location.hostname)
    ? "http://localhost:3001"
    : "https://iqraa-erp-backend.onrender.com";

  function getAdminDashboard() {
    return fetch(DASHBOARD_API_BASE + "/api/dashboard/admin", {
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

  function getPmDashboard() {
    return fetch(DASHBOARD_API_BASE + "/api/dashboard/pm", {
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

  return { getAdminDashboard: getAdminDashboard, getPmDashboard: getPmDashboard };
})();
