/*
 * Email — runtime config for contact-form submissions.
 *
 *  - Reads <script type="application/json" id="aed-email-config"> once on load.
 *  - Applies config to every <form data-aed-form> on the page:
 *      · endpoint       → overrides form.action
 *      · subject        → sets hidden input name="_subject"
 *      · brandOverride  → sets hidden input name="brand"
 *      · debug          → console-logs the submitted FormData on submit
 *
 * Pair with the `forms` addon, which handles the actual AJAX submission.
 * This addon only rewrites form metadata; it does not intercept submit.
 *
 * See /email/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var CONFIG_ID = 'aed-email-config';

  function readConfig() {
    var el = document.getElementById(CONFIG_ID);
    if (!el) return null;
    try { return JSON.parse(el.textContent || '{}'); }
    catch (e) { console.warn('[email] invalid config JSON', e); return null; }
  }

  function upsertHidden(form, name, value) {
    var existing = form.querySelector('input[name="' + name + '"]');
    if (existing) { existing.value = value; return; }
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  function attachDebug(form) {
    form.addEventListener('submit', function () {
      var fd = new FormData(form);
      var obj = {};
      fd.forEach(function (v, k) { obj[k] = v instanceof File ? '(file)' : v; });
      console.info('[email] submit payload for', form.id || '<unnamed form>', obj);
    }, true);
  }

  function apply(cfg) {
    if (!cfg) return;
    var forms = document.querySelectorAll('form[data-aed-form]');
    if (!forms.length) return;
    forms.forEach(function (form) {
      if (cfg.endpoint)      form.setAttribute('action', cfg.endpoint);
      if (cfg.subject)       upsertHidden(form, '_subject', cfg.subject);
      if (cfg.brandOverride) upsertHidden(form, 'brand', cfg.brandOverride);
      if (cfg.debug)         attachDebug(form);
    });
  }

  function boot() { apply(readConfig()); }

  window.__email = { version: VERSION, apply: apply, readConfig: readConfig };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
