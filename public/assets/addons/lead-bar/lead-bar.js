/*
 * Lead Bar — drop-in conversion bar.
 *
 * Opt-in via <meta name="aed:lead-bar" content="on">. With no other
 * config, auto-detects the phone number from the first
 * <a href="tel:..."> in the DOM (typically your nav / footer) and links
 * the secondary CTA to /contact/.
 *
 * Override with an inline JSON block:
 *   <script type="application/json" id="aed-lead-bar-config">
 *   { "phone": "+15125550188", "phoneLabel": "Call now",
 *     "cta": { "href": "/start/", "label": "Get a quote" },
 *     "hideOnPaths": ["/contact/", "/start/"],
 *     "showAfter": 400 }
 *   </script>
 *
 * See /lead-bar/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var SS_DISMISS = 'aed:lead-bar:dismissed';

  // -- Read opt-in flag --------------------------------------------------
  var enabled = (function () {
    var meta = document.querySelector('meta[name="aed:lead-bar"]');
    if (!meta) return false;
    var v = (meta.getAttribute('content') || '').toLowerCase();
    return v === 'on' || v === 'true' || v === '1';
  })();
  if (!enabled) return;

  // -- Defaults + config -------------------------------------------------
  var config = {
    phone: null,             // takes priority if set or auto-detected
    email: null,             // used as primary if no phone
    phoneLabel: 'Call now',
    emailLabel: 'Email us',
    cta: { href: '/contact/', label: 'Get a quote' },
    showAfter: 0,            // px scrolled before reveal
    hideOnPaths: ['/contact/'],
    dismissable: true,
  };

  (function loadConfig() {
    var el = document.getElementById('aed-lead-bar-config');
    if (!el) return;
    try {
      var cfg = JSON.parse(el.textContent || '{}');
      Object.keys(cfg).forEach(function (k) {
        if (k === 'cta' && cfg.cta) {
          config.cta = Object.assign({}, config.cta, cfg.cta);
        } else {
          config[k] = cfg[k];
        }
      });
    } catch (_) {}
  })();

  // -- Auto-detect contact: phone wins, email fallback ------------------
  if (!config.phone) {
    var telLink = document.querySelector('a[href^="tel:"]');
    if (telLink) config.phone = telLink.getAttribute('href').replace(/^tel:/, '');
  }
  if (!config.phone && !config.email) {
    var mailLink = document.querySelector('a[href^="mailto:"]');
    if (mailLink) config.email = mailLink.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
  }
  var primary = config.phone
    ? { kind: 'phone', value: config.phone, label: config.phoneLabel }
    : config.email
    ? { kind: 'email', value: config.email, label: config.emailLabel }
    : null;
  if (!primary) return; // nothing to promote

  // -- Hide on configured paths -----------------------------------------
  var path = window.location.pathname;
  for (var i = 0; i < config.hideOnPaths.length; i++) {
    var p = config.hideOnPaths[i];
    if (path === p || path === p + '/' || (p.endsWith('/') && path === p.slice(0, -1))) return;
  }

  // -- Dismissed this session? ------------------------------------------
  try {
    if (sessionStorage.getItem(SS_DISMISS) === '1') return;
  } catch (_) {}

  // -- Format phone for display -----------------------------------------
  function displayPhone(raw) {
    var digits = raw.replace(/[^\d]/g, '');
    if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
    if (digits.length === 10) {
      return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
    }
    return raw;
  }

  // -- Build markup -----------------------------------------------------
  function build() {
    var bar = document.createElement('aside');
    bar.className = 'lead-bar';
    bar.setAttribute('role', 'complementary');
    bar.setAttribute('aria-label', 'Quick contact');
    bar.hidden = true;

    var primaryEl = document.createElement('a');
    primaryEl.className = 'lead-bar-phone';
    primaryEl.setAttribute('data-aed-lead', primary.kind);
    var icon, displayValue;
    if (primary.kind === 'phone') {
      primaryEl.href = 'tel:' + primary.value.replace(/[^+\d]/g, '');
      icon = '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/>';
      displayValue = displayPhone(primary.value);
    } else {
      primaryEl.href = 'mailto:' + primary.value;
      icon = '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>';
      displayValue = primary.value;
    }
    primaryEl.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icon + '</svg>' +
      '<span class="lead-bar-phone-label">' + escapeHtml(primary.label) + '</span>' +
      '<span class="lead-bar-phone-number">' + escapeHtml(displayValue) + '</span>';

    if (config.cta && config.cta.href && config.cta.label) {
      var cta = document.createElement('a');
      cta.className = 'lead-bar-cta';
      cta.href = config.cta.href;
      cta.textContent = config.cta.label;
      cta.setAttribute('data-aed-lead', 'cta');
      bar.appendChild(cta);
    }

    bar.appendChild(primaryEl);

    if (config.dismissable) {
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'lead-bar-dismiss';
      x.setAttribute('aria-label', 'Dismiss');
      x.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
        '<path d="M6 6l12 12M18 6L6 18"/></svg>';
      x.addEventListener('click', dismiss);
      bar.appendChild(x);
    }

    document.body.appendChild(bar);
    return bar;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  var bar = null;

  function show() {
    if (!bar) bar = build();
    bar.hidden = false;
    document.body.classList.add('aed-leadbar-active');
    requestAnimationFrame(function () { bar.classList.add('is-open'); });
  }

  function hide(persist) {
    if (!bar) return;
    bar.classList.remove('is-open');
    document.body.classList.remove('aed-leadbar-active');
    setTimeout(function () { if (bar) bar.hidden = true; }, 300);
    if (persist) {
      try { sessionStorage.setItem(SS_DISMISS, '1'); } catch (_) {}
    }
  }

  function dismiss() { hide(true); }

  // -- Reveal trigger: immediate or after scroll ------------------------
  function attemptShow() {
    if (config.showAfter > 0) {
      var onScroll = function () {
        if (window.scrollY >= config.showAfter) {
          window.removeEventListener('scroll', onScroll);
          show();
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    } else {
      show();
    }
  }

  // -- Coordinate with consent banner: defer until first answer --------
  function start() {
    var pending = document.querySelector('.consent-banner:not([hidden])');
    if (pending) {
      // Wait for the user to answer the consent banner before promoting CTAs
      document.addEventListener('aed:consent:change', function once() {
        document.removeEventListener('aed:consent:change', once);
        attemptShow();
      });
    } else {
      attemptShow();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Console handle for testing
  window.__leadBar = {
    version: VERSION,
    show: show,
    hide: function () { hide(false); },
    dismiss: dismiss,
    reset: function () {
      try { sessionStorage.removeItem(SS_DISMISS); } catch (_) {}
      if (bar) { bar.remove(); bar = null; }
      document.body.classList.remove('aed-leadbar-active');
      attemptShow();
    },
    config: config,
  };
})();
