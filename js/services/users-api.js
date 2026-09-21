/* Thin client for the Users backend (team.html's "New Team Member" form).
   Follows the project's existing external-integration-placeholder
   convention (CLAUDE.md §18, see N8N_LEAD_WEBHOOK_URL in
   js/pages/landing.js for the precedent): one named constant for the
   endpoint, defaulted to the local dev backend in backend/server.js
   (see that folder's README for how to run it). Swapping in the real
   deployed backend URL later is a one-line change here, nothing else to
   touch.

   Architecture (per the 2026-09-21g "User Management foundation" task):
     team.html (frontend)
       -> POST /api/users on this backend
       -> Backend hashes the password and calls the Airtable REST API
       -> Airtable Users table (base appFUvcg5tY2Dup8U, table tblOql5BcXCNhPFIS)
   The frontend never talks to Airtable directly and never sees or stores
   an Airtable PAT — see backend/server.js and backend/.env.example.

   2026-09-21h: POST /api/users now requires an authenticated Admin
   session (backend/server.js's requireAuth/requireRole("admin")), so
   this request must send the session cookie — credentials:"include". */
window.IQRAA = window.IQRAA || {};
IQRAA.services = IQRAA.services || {};

IQRAA.services.usersApi = (function () {
  var USERS_API_BASE = "http://localhost:3001";

  function createUser(payload) {
    return fetch(USERS_API_BASE + "/api/users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (body) {
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

  return { createUser: createUser };
})();
