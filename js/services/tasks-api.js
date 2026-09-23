/* Thin client for the real, Airtable-backed My Tasks endpoint
   (2026-09-23 "Connect My Tasks to Airtable"). Same
   external-integration-placeholder convention as js/services/projects-api.js/
   users-api.js/auth.js (CLAUDE.md §18): one named constant for the
   backend origin, swapping in the real deployed backend URL later is a
   one-line change.

     pages/my-tasks.html
       -> GET /api/tasks/my on this backend (credentials:"include", a
          session is required — see backend/server.js)
       -> backend resolves the authenticated session user to their real
          Airtable Users record id and filters Tasks by the real
          Tasks.Assignee linked-record field (never the Users.User ID
          text field, never a frontend-supplied id)
       -> Airtable Tasks table (base appFUvcg5tY2Dup8U, table tbl7RP40DUSKs5WKW)

   Deliberately uncached: getMyTasks() issues a fresh network request
   every time it's called — every page load calls it anew, same pattern
   as projectsApi.getProjects(). */
window.IQRAA = window.IQRAA || {};
IQRAA.services = IQRAA.services || {};

IQRAA.services.tasksApi = (function () {
  var TASKS_API_BASE = /^(localhost|127\.0\.0\.1)?$/.test(window.location.hostname)
    ? "http://localhost:3001"
    : "https://iqraa-app-backend.onrender.com";

  function getMyTasks() {
    return fetch(TASKS_API_BASE + "/api/tasks/my", {
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
          return (body && body.tasks) || [];
        });
    });
  }

  return { getMyTasks: getMyTasks };
})();
