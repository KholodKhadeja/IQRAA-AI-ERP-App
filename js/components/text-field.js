/* Plain-JS port of components/ui/TextField.tsx. */
window.IQRAA = window.IQRAA || {};
IQRAA.components = IQRAA.components || {};

IQRAA.components.textField = (function (ns) {
  function render(opts) {
    opts = opts || {};
    var id = opts.id;
    var type = opts.isPassword ? "password" : opts.type || "text";
    var required = opts.required ? " required" : "";
    var autoComplete = opts.autoComplete ? ' autocomplete="' + opts.autoComplete + '"' : "";
    var toggle = opts.isPassword
      ? '<button type="button" class="text-field__toggle" id="' + id + '-toggle" aria-pressed="false"></button>'
      : "";
    return (
      '<div class="text-field">' +
      '<label for="' + id + '" class="text-field__label" data-i18n="' + opts.labelI18nKey + '"></label>' +
      '<div class="text-field__input-wrap">' +
      '<input id="' + id + '" name="' + (opts.name || id) + '" type="' + type + '" class="text-field__input"' + required + autoComplete + ' />' +
      toggle +
      "</div>" +
      '<span id="' + id + '-error" class="text-field__error" role="alert" hidden></span>' +
      "</div>"
    );
  }

  function wirePasswordToggle(id, showLabelKey, hideLabelKey) {
    var toggleBtn = document.getElementById(id + "-toggle");
    var input = document.getElementById(id);
    if (!toggleBtn || !input) return;

    function sync(visible) {
      input.type = visible ? "text" : "password";
      toggleBtn.setAttribute("aria-pressed", String(visible));
      toggleBtn.setAttribute("aria-label", ns.i18n.t(visible ? hideLabelKey : showLabelKey));
      toggleBtn.innerHTML = visible ? ns.icons.eyeOff(18) : ns.icons.eye(18);
    }

    toggleBtn.addEventListener("click", function () {
      sync(input.type === "password");
    });
    sync(false);
  }

  function setError(id, message) {
    var input = document.getElementById(id);
    var errorEl = document.getElementById(id + "-error");
    if (!input || !errorEl) return;
    if (message) {
      errorEl.innerHTML = ns.icons.alertCircle(14) + message;
      errorEl.hidden = false;
      input.classList.add("text-field__input--error");
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", id + "-error");
    } else {
      errorEl.hidden = true;
      errorEl.textContent = "";
      input.classList.remove("text-field__input--error");
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  }

  return { render: render, wirePasswordToggle: wirePasswordToggle, setError: setError };
})(window.IQRAA);
