/*
 * Mailing List — drop-in newsletter signup.
 *
 *   <div data-aed-mailing-list></div>
 *
 * Configure with an inline JSON block (id from site.json json[]):
 *   {
 *     "provider": "convertkit",          // convertkit | beehiiv | buttondown | mailerlite | custom
 *     "endpoint": "https://...",         // form action URL
 *     "headline": "Subscribe",
 *     "body":     "Monthly notes on running a productized service.",
 *     "placeholder": "you@example.com",
 *     "buttonLabel": "Subscribe",
 *     "footer":   "Unsubscribe anytime. We don't share your address.",
 *     "successMessage": "Check your inbox to confirm.",
 *     "errorMessage":   "Hmm — try again in a bit?",
 *     "extraFields": {                    // appended to POST body
 *       "tags": "newsletter,launch"
 *     }
 *   }
 *
 * Provider notes:
 *   - convertkit:  endpoint = your form's POST URL (form/<id>/subscriptions). POSTs JSON.
 *   - beehiiv:     endpoint = form action URL. POSTs FormData.
 *   - buttondown:  endpoint = "https://buttondown.email/api/emails/embed-subscribe/<your-username>". POSTs FormData.
 *   - mailerlite:  endpoint = your embedded form action URL. POSTs FormData.
 *   - custom:      endpoint POSTs FormData. Your endpoint should return 2xx for success.
 *
 * Per-element override of the inline JSON: set
 *   <div data-aed-mailing-list data-aed-ml-source="some-other-id">
 * to read a differently-named JSON block on the same page.
 *
 * Public API:
 *   window.__mailingList.refresh()
 *
 * See /mailing-list/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function loadConfig(host) {
    var id = host.getAttribute('data-aed-ml-source') || 'aed-mailing-list';
    var el = document.getElementById(id);
    if (!el) return null;
    try { return JSON.parse(el.textContent || '{}'); }
    catch (_) { return null; }
  }

  function defaults() {
    return {
      provider: 'custom',
      endpoint: '',
      headline: 'Subscribe',
      body: '',
      placeholder: 'you@example.com',
      buttonLabel: 'Subscribe',
      footer: '',
      successMessage: 'Thanks — check your inbox to confirm.',
      errorMessage: 'Something went wrong. Please try again.',
      extraFields: {},
    };
  }

  function build(host) {
    if (host.dataset.aedMlReady === '1') return;
    host.dataset.aedMlReady = '1';
    host.classList.add('aed-ml');

    var cfg = Object.assign(defaults(), loadConfig(host) || {});
    if (!cfg.endpoint) {
      host.innerHTML = '<div class="aed-ml-status" data-aed-ml-state="error">Mailing list endpoint not configured.</div>';
      return;
    }

    host.innerHTML =
      (cfg.headline ? '<h3 class="aed-ml-headline">' + escapeHtml(cfg.headline) + '</h3>' : '') +
      (cfg.body ? '<p class="aed-ml-body">' + escapeHtml(cfg.body) + '</p>' : '') +
      '<form class="aed-ml-form" novalidate>' +
        '<div class="aed-ml-row">' +
          '<input type="email" name="email" required autocomplete="email" ' +
                 'class="aed-ml-input" placeholder="' + escapeHtml(cfg.placeholder) + '" aria-label="Email address">' +
          '<button type="submit" class="aed-ml-btn">' + escapeHtml(cfg.buttonLabel) + '</button>' +
        '</div>' +
        (cfg.footer ? '<p class="aed-ml-foot">' + escapeHtml(cfg.footer) + '</p>' : '') +
        '<div class="aed-ml-status" hidden></div>' +
      '</form>';

    var form = host.querySelector('.aed-ml-form');
    var input = form.querySelector('input[name="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var status = form.querySelector('.aed-ml-status');

    function setStatus(kind, msg) {
      status.hidden = false;
      status.setAttribute('data-aed-ml-state', kind);
      status.textContent = msg;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input.value.trim() || !/^.+@.+\..+$/.test(input.value.trim())) {
        setStatus('error', 'Please enter a valid email.');
        input.focus();
        return;
      }
      btn.disabled = true;
      var originalLabel = btn.textContent;
      btn.textContent = '…';

      submit(cfg, input.value.trim()).then(function (ok) {
        btn.disabled = false;
        btn.textContent = originalLabel;
        if (ok) {
          setStatus('success', cfg.successMessage);
          form.querySelector('.aed-ml-row').hidden = true;
          host.dispatchEvent(new CustomEvent('aed:mailing-list:success', { detail: { email: input.value.trim() }, bubbles: true }));
        } else {
          setStatus('error', cfg.errorMessage);
          host.dispatchEvent(new CustomEvent('aed:mailing-list:error', { detail: { email: input.value.trim() }, bubbles: true }));
        }
      });
    });
  }

  function submit(cfg, email) {
    var headers = { 'Accept': 'application/json' };
    var body;

    if (cfg.provider === 'convertkit') {
      // ConvertKit accepts JSON
      var payload = Object.assign({ email_address: email }, cfg.extraFields || {});
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(payload);
    } else {
      // Beehiiv, Buttondown, MailerLite, custom — all happy with FormData
      var fd = new FormData();
      fd.append('email', email);
      // Buttondown convention
      if (cfg.provider === 'buttondown') fd.append('email_input', email);
      Object.keys(cfg.extraFields || {}).forEach(function (k) {
        fd.append(k, cfg.extraFields[k]);
      });
      body = fd;
    }

    return fetch(cfg.endpoint, { method: 'POST', headers: headers, body: body, mode: 'no-cors' === false ? 'cors' : 'no-cors' })
      .then(function (r) {
        // For no-cors / opaque responses, status === 0 — treat as success since
        // most providers return opaque responses on cross-origin POST.
        if (r.type === 'opaque') return true;
        return r.ok;
      })
      .catch(function () { return false; });
  }

  function scan() {
    document.querySelectorAll('[data-aed-mailing-list]').forEach(build);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__mailingList = {
    version: VERSION,
    refresh: scan,
  };
})();
