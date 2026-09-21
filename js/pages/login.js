/* Login page behavior. 2026-09-21h: wired to the real backend auth flow
   (js/services/auth.js -> backend/server.js -> Airtable) — the Login
   HTML/CSS is unchanged (explicit requirement of that task), only this
   script's behavior. On success, redirects by the role the backend
   returned; on any failure (wrong password, unknown email, inactive
   account, unmapped role) shows the same generic "login.authError"
   message the page already had — the backend already guarantees it
   never reveals which reason caused the failure, and this script must
   not add a second, more specific message on top of that. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* Every role this app has (CLAUDE.md §2/§4) mapped to its dashboard
     entry point — the same 4 files workspace-chrome.js already treats
     as the per-role landing pages. */
  var ROLE_TO_DASHBOARD = {
    admin: "dashboard-admin.html",
    pm: "dashboard-pm.html",
    teamMember: "dashboard-team.html",
    client: "dashboard-client.html"
  };

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("login-form");
    if (!form) return;

    ns.components.textField.wirePasswordToggle("login-password", "login.showPassword", "login.hidePassword");

    var emailInput = document.getElementById("login-email");
    var passwordInput = document.getElementById("login-password");
    var submitBtn = document.getElementById("login-submit");
    var authErrorEl = document.getElementById("login-auth-error");
    var successEl = document.getElementById("login-success");
    var emailTouched = false;

    function validateEmail() {
      var error = "";
      if (emailTouched && emailInput.value.length > 0 && !EMAIL_PATTERN.test(emailInput.value)) {
        error = ns.i18n.t("login.emailInvalid");
      } else if (emailTouched && emailInput.value.length === 0) {
        error = ns.i18n.t("login.emailRequired");
      }
      ns.components.textField.setError("login-email", error);
      return !error;
    }

    emailInput.addEventListener("blur", function () {
      emailTouched = true;
      validateEmail();
    });
    emailInput.addEventListener("input", function () {
      if (emailTouched) validateEmail();
    });

    function setLoading(isLoading) {
      submitBtn.disabled = isLoading;
      submitBtn.innerHTML = isLoading
        ? ns.icons.loader2(18, { className: "login-spinner" }) + '<span data-i18n="login.submitting"></span>'
        : '<span data-i18n="login.submit"></span>';
      ns.i18n.translatePage(submitBtn);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      emailTouched = true;
      var emailValid = validateEmail();

      if (!emailValid || !EMAIL_PATTERN.test(emailInput.value) || passwordInput.value.length === 0) {
        return;
      }

      authErrorEl.hidden = true;
      setLoading(true);

      ns.services.auth
        .login({ email: emailInput.value, password: passwordInput.value })
        .then(function (result) {
          successEl.hidden = false;
          var role = result && result.user && result.user.role;
          var destination = ROLE_TO_DASHBOARD[role] || ROLE_TO_DASHBOARD.admin;
          window.location.href = destination;
          /* Deliberately not calling setLoading(false) on this path — the
             page is navigating away, and re-enabling the submit button
             for the instant before that happens would just flicker. */
        })
        .catch(function () {
          authErrorEl.hidden = false;
          setLoading(false);
        });
    });
  });
})(window.IQRAA);
