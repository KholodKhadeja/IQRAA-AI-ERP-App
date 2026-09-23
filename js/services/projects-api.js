/* Thin client for the real, Airtable-backed Projects endpoint
   (2026-09-21k "Connect Projects to Airtable"). Same
   external-integration-placeholder convention as js/services/users-api.js/
   auth.js (CLAUDE.md §18): one named constant for the backend origin,
   swapping in the real deployed backend URL later is a one-line change.

     pages/projects.html / pages/project-workspace.html
       -> GET /api/projects on this backend (credentials:"include", a
          session is required — see backend/server.js)
       -> backend reads the Projects table from Airtable and returns JSON
       -> Airtable Projects table (base appFUvcg5tY2Dup8U, table tblK5seFEBbACNEWq)

   Deliberately uncached: getProjects() issues a fresh network request
   every time it's called — every page load calls it anew rather than
   reusing a previous result, so editing a project directly in Airtable
   and reloading the page reflects the change. */
window.IQRAA = window.IQRAA || {};
IQRAA.services = IQRAA.services || {};

IQRAA.services.projectsApi = (function () {
  /* Local dev (or file://) hits the local backend; the deployed static
     site hits the deployed backend service (render.yaml) — see
     js/services/auth.js for why this can't stay a plain hardcoded
     localhost URL once the site is actually deployed. */
  var PROJECTS_API_BASE = /^(localhost|127\.0\.0\.1)?$/.test(window.location.hostname)
    ? "http://localhost:3001"
    : "https://iqraa-app-backend.onrender.com";

  function getProjects() {
    return fetch(PROJECTS_API_BASE + "/api/projects", {
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
          return (body && body.projects) || [];
        });
    });
  }

  return { getProjects: getProjects };
})();
