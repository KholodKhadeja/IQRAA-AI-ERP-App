/* Real backend-backed auth client (2026-09-21h "Login authentication
   flow" task — replaces the earlier MockAuthProvider that always
   resolved to a fixed Admin user via sessionStorage).

   Frontend -> Backend -> Airtable, never Frontend -> Airtable directly:
     login()      -> POST /api/auth/login  (backend looks up Email in
                      Airtable, checks Status, verifies the password with
                      bcrypt, creates a server-side session + HTTPOnly
                      cookie, updates Last Login)
     logout()     -> POST /api/auth/logout (destroys the session)
     getSession() -> GET  /api/auth/me     (confirms the session cookie
                      is still valid; resolves null on any failure)

   Every request sends credentials:"include" so the session cookie
   (backend/server.js's "iqraa.sid", HTTPOnly + SameSite=Lax) travels
   with it — this file never reads, writes, or even sees that cookie's
   value, an Airtable PAT, or a Password Hash. getSession() is
   deliberately async now (a network call, not a sessionStorage read) —
   every caller (js/workspace-chrome.js) awaits it. */
window.IQRAA = window.IQRAA || {};

IQRAA.services = IQRAA.services || {};
IQRAA.services.auth = (function () {
  /* Local dev (or a page opened via file://) hits the local backend from
     backend/README.md; anywhere else (the deployed static site) hits the
     deployed backend service (render.yaml). Without this branch a
     deployed page would try to reach a loopback address from a public
     origin, which browsers refuse (Private Network Access) even before
     CORS is considered. */
  var AUTH_API_BASE = /^(localhost|127\.0\.0\.1)?$/.test(window.location.hostname)
    ? "http://localhost:3001"
    : "https://iqraa-app-backend.onrender.com";

  function login(credentials) {
    return fetch(AUTH_API_BASE + "/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: credentials.email, password: credentials.password })
    }).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (body) {
          if (!response.ok) {
            var error = new Error((body && body.error) || "Login failed.");
            error.status = response.status;
            throw error;
          }
          return body;
        });
    });
  }

  function logout() {
    return fetch(AUTH_API_BASE + "/api/auth/logout", {
      method: "POST",
      credentials: "include"
    }).then(function () {
      /* Nothing left to clear client-side — there is no sessionStorage
         mirror of the session anymore, the cookie itself is what the
         backend just invalidated. */
    });
  }

  function getSession() {
    return fetch(AUTH_API_BASE + "/api/auth/me", {
      credentials: "include"
    })
      .then(function (response) {
        if (!response.ok) return null;
        return response.json().then(function (body) {
          return body && body.user ? { user: body.user } : null;
        });
      })
      .catch(function () {
        return null;
      });
  }

  return { login: login, logout: logout, getSession: getSession };
})();
