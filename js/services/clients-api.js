/* Thin client for the real, Airtable-backed Clients endpoints (2026-09-22b
   "Connect Clients to Airtable"). Same external-integration-placeholder
   convention as the other *-api.js services (CLAUDE.md §18).

     pages/clients.html          -> GET /api/clients     (Admin only)
     pages/client-project.html   -> GET /api/clients/me   (Client only,
                                      scoped server-side to the caller's
                                      own client record — see
                                      backend/server.js's Clients section)

   Both credentials:"include" (session cookie) and deliberately uncached
   — a fresh request every call, so editing a client/project in Airtable
   and reloading the page reflects the change. */
window.IQRAA = window.IQRAA || {};
IQRAA.services = IQRAA.services || {};

IQRAA.services.clientsApi = (function () {
  /* Local dev (or file://) hits the local backend; the deployed static
     site hits the deployed backend service (render.yaml) — see
     js/services/auth.js for why this can't stay a plain hardcoded
     localhost URL once the site is actually deployed. */
  var CLIENTS_API_BASE = /^(localhost|127\.0\.0\.1)?$/.test(window.location.hostname)
    ? "http://localhost:3001"
    : "https://iqraa-app-backend.onrender.com";

  function handleJsonResponse(response) {
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
  }

  function getClients() {
    return fetch(CLIENTS_API_BASE + "/api/clients", {
      credentials: "include"
    })
      .then(handleJsonResponse)
      .then(function (body) {
        return (body && body.clients) || [];
      });
  }

  function getMyClientProjects() {
    return fetch(CLIENTS_API_BASE + "/api/clients/me", {
      credentials: "include"
    }).then(handleJsonResponse);
  }

  return { getClients: getClients, getMyClientProjects: getMyClientProjects };
})();
