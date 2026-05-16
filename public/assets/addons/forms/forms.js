/*
 * Forms — drop-in submission handler for any <form data-aed-form>.
 *
 *  - Intercepts submit, posts via fetch (Formspree / Basin / Web3Forms /
 *    any endpoint that accepts JSON or multipart and returns 2xx).
 *  - Replaces the form with an inline success card on success.
 *  - Shows an inline error banner on failure (data preserved).
 *  - Auto-injects a `_gotcha` honeypot. Filled-by-bot submits silently
 *    "succeed" without hitting the network.
 *  - Reads endpoint from the form's `action`, falling back to a
 *    page-level `<meta name="aed:form-endpoint" content="...">`.
 *  - Fires 'aed:form:success' / 'aed:form:error' events on the form
 *    so other code (analytics, custom UI) can react.
 *
 * Configure per form via data-attributes:
 *   data-aed-form                              opt-in marker
 *   data-aed-form-endpoint="..."               override action
 *   data-aed-form-success-title="Sent!"        success card title
 *   data-aed-form-success-body="..."           success card body
 *   data-aed-form-redirect="/contact/success/" full-page redirect on success
 *
 * See /forms/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var HONEYPOT_NAME = '_gotcha';     // Formspree convention; harmless on others
  var DEFAULT_ENDPOINT = (function () {
    var meta = document.querySelector('meta[name="aed:form-endpoint"]');
    return meta ? meta.getAttribute('content') : null;
  })();

  function attach(form) {
    if (form.dataset.aedFormReady === '1') return;
    form.dataset.aedFormReady = '1';

    injectHoneypot(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submit(form);
    });
  }

  function injectHoneypot(form) {
    if (form.querySelector('input[name="' + HONEYPOT_NAME + '"]')) return;
    var hp = document.createElement('input');
    hp.type = 'text';
    hp.name = HONEYPOT_NAME;
    hp.tabIndex = -1;
    hp.autocomplete = 'off';
    hp.setAttribute('aria-hidden', 'true');
    hp.className = 'aed-form-honeypot';
    var label = document.createElement('label');
    label.className = 'aed-form-honeypot';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = 'Leave this field empty';
    label.appendChild(hp);
    form.appendChild(label);
  }

  function submit(form) {
    var endpoint = form.getAttribute('data-aed-form-endpoint')
      || form.getAttribute('action')
      || DEFAULT_ENDPOINT;
    if (!endpoint) {
      showError(form, 'Form is not configured — missing endpoint.');
      return;
    }

    var data = new FormData(form);

    // Honeypot: bot-filled means silent fake-success (don't hit endpoint)
    var trap = data.get(HONEYPOT_NAME);
    if (trap) { showSuccess(form); return; }
    data.delete(HONEYPOT_NAME); // strip from real payload

    setSubmitting(form, true);
    clearError(form);

    var method = (form.getAttribute('method') || 'POST').toUpperCase();

    fetch(endpoint, {
      method: method,
      body: data,
      headers: { 'Accept': 'application/json' },
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().catch(function () { return null; }).then(function (json) {
            var msg = (json && (json.error || (json.errors && json.errors[0] && json.errors[0].message)))
              || ('Request failed (' + res.status + ').');
            throw new Error(msg);
          });
        }
        return res.json().catch(function () { return {}; });
      })
      .then(function (payload) {
        setSubmitting(form, false);
        var redirect = form.getAttribute('data-aed-form-redirect');
        if (redirect) {
          window.location.assign(redirect);
          return;
        }
        showSuccess(form);
        emit(form, 'aed:form:success', { payload: payload });
      })
      .catch(function (err) {
        setSubmitting(form, false);
        showError(form, err.message || 'Something went wrong. Please try again.');
        emit(form, 'aed:form:error', { error: err });
      });
  }

  function emit(form, name, detail) {
    form.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: true }));
  }

  function setSubmitting(form, on) {
    form.dataset.aedState = on ? 'submitting' : '';
    var submit = form.querySelector('[type="submit"]');
    if (submit) {
      submit.disabled = !!on;
      if (on && !submit.querySelector('[data-aed-submit-spinner]')) {
        var s = document.createElement('span');
        s.setAttribute('data-aed-submit-spinner', '');
        s.setAttribute('aria-hidden', 'true');
        submit.appendChild(s);
      }
    }
  }

  function clearError(form) {
    var existing = form.querySelector(':scope > .aed-form-error');
    if (existing) existing.hidden = true;
  }

  function showError(form, msg) {
    var box = form.querySelector(':scope > .aed-form-error');
    if (!box) {
      box = document.createElement('div');
      box.className = 'aed-form-error';
      box.setAttribute('role', 'alert');
      box.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' +
        '</svg>' +
        '<div class="aed-form-error-text"><strong>Couldn\'t send.</strong> <span data-aed-error-msg></span></div>';
      form.insertBefore(box, form.firstChild);
    }
    box.querySelector('[data-aed-error-msg]').textContent = msg;
    box.hidden = false;
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function showSuccess(form) {
    var title = form.getAttribute('data-aed-form-success-title') || 'Thanks — we got it.';
    var body = form.getAttribute('data-aed-form-success-body')
      || 'Your message is in our inbox. We\'ll be in touch shortly.';

    var card = document.createElement('div');
    card.className = 'aed-form-success';
    card.setAttribute('role', 'status');
    card.innerHTML =
      '<span class="aed-form-success-icon">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<polyline points="20 6 9 17 4 12"></polyline>' +
        '</svg>' +
      '</span>' +
      '<h3 class="aed-form-success-title"></h3>' +
      '<p class="aed-form-success-body"></p>';
    card.querySelector('.aed-form-success-title').textContent = title;
    card.querySelector('.aed-form-success-body').textContent = body;

    form.parentNode.replaceChild(card, form);

    // Move focus for screen readers
    card.tabIndex = -1;
    card.focus({ preventScroll: false });
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Public API for manual control
  window.__forms = {
    version: VERSION,
    attach: attach,
    submit: submit,
  };

  function boot() {
    document.querySelectorAll('form[data-aed-form]').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
