/* Plain-JS port of pages/Landing/LandingPage.tsx's contact-form behavior.
   Static content (hero highlights, product tiles, workflow steps) is
   authored directly in index.html with data-i18n paths, including array
   indices (e.g. data-i18n="hero.highlights.0") — translatePage() resolves
   those the same way it resolves any other key. */
window.IQRAA = window.IQRAA || {};

(function (ns) {
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  /* Israeli phone numbers: a leading 0 (mobile 05X or landline area code)
     followed by 8-9 more digits, or the same number in +972 form. Spaces/
     dashes are stripped before testing so "050-123-4567" validates the
     same as "0501234567". */
  var PHONE_PATTERN = /^(0\d{8,9}|\+?972\d{8,9})$/;
  function normalizePhone(value) {
    return value.replace(/[\s-]/g, "");
  }

  /* Public webhook URL for the n8n lead-capture workflow (see
     "n8n Workflows/Landing_Lead_Capture_Workflow.json"). Not a secret —
     there's no build step to inject an env var here, so it's a plain
     constant. Leave empty to fall back to a local-only demo success. */
  var N8N_LEAD_WEBHOOK_URL = "https://kholod-khadeja.app.n8n.cloud/webhook/c4982a0b-c43f-4ab0-b4b4-88c5b72510d0";

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var fields = {
      name: document.getElementById("contact-name"),
      organization: document.getElementById("contact-organization"),
      email: document.getElementById("contact-email"),
      phone: document.getElementById("contact-phone")
    };
    var touched = { name: false, organization: false, email: false, phone: false };
    var submitBtn = document.getElementById("contact-submit");
    var submitError = document.getElementById("contact-submit-error");
    var formFields = document.getElementById("contact-form-fields");
    var successMessage = document.getElementById("contact-success");

    function validate(showAll) {
      if (showAll) {
        touched.name = touched.organization = touched.email = touched.phone = true;
      }
      var nameError = touched.name && fields.name.value.trim().length === 0
        ? ns.i18n.t("contact.nameRequired") : "";
      var orgError = touched.organization && fields.organization.value.trim().length === 0
        ? ns.i18n.t("contact.orgRequired") : "";
      var emailError = touched.email && fields.email.value.length === 0
        ? ns.i18n.t("contact.emailRequired")
        : touched.email && !EMAIL_PATTERN.test(fields.email.value)
          ? ns.i18n.t("contact.emailInvalid") : "";
      var phoneError = touched.phone && fields.phone.value.trim().length === 0
        ? ns.i18n.t("contact.phoneRequired")
        : touched.phone && !PHONE_PATTERN.test(normalizePhone(fields.phone.value))
          ? ns.i18n.t("contact.phoneInvalid") : "";

      ns.components.textField.setError("contact-name", nameError);
      ns.components.textField.setError("contact-organization", orgError);
      ns.components.textField.setError("contact-email", emailError);
      ns.components.textField.setError("contact-phone", phoneError);

      return !nameError && !orgError && !emailError && !phoneError;
    }

    Object.keys(fields).forEach(function (key) {
      fields[key].addEventListener("blur", function () {
        touched[key] = true;
        validate(false);
      });
      fields[key].addEventListener("input", function () {
        if (touched[key]) validate(false);
      });
    });

    function setSubmitting(isSubmitting) {
      submitBtn.disabled = isSubmitting;
      submitBtn.innerHTML = isSubmitting
        ? '<span data-i18n="contact.submitting"></span>' + ns.icons.loader2(18, { className: "landing-spinner" })
        : '<span data-i18n="contact.submit"></span>' + ns.icons.arrowLeft(18);
      ns.i18n.translatePage(submitBtn);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      submitError.hidden = true;

      if (!validate(true)) return;

      var payload = {
        name: fields.name.value,
        organization: fields.organization.value,
        email: fields.email.value,
        phone: fields.phone.value,
        message: document.getElementById("contact-message").value
      };

      function showSuccess() {
        formFields.hidden = true;
        successMessage.hidden = false;
      }

      if (!N8N_LEAD_WEBHOOK_URL) {
        showSuccess();
        return;
      }

      setSubmitting(true);
      fetch(N8N_LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Webhook request failed");
          showSuccess();
        })
        .catch(function () {
          submitError.hidden = false;
        })
        .finally(function () {
          setSubmitting(false);
        });
    });
  });
})(window.IQRAA);
