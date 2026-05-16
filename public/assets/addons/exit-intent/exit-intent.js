/*
 * Exit Intent — drop-in last-chance modal.
 *
 * Opt-in via <meta name="aed:exit-intent" content="on">. Fires once per
 * session when the user signals they're leaving:
 *   - Desktop: mouse moves up out of the viewport (clientY <= 0)
 *   - Mobile: scroll-up burst after dwellMs and minScrollPercent met
 *
 * Defers to the consent banner. Suppressed if any other addon modal /
 * panel is currently open (contact-fab, booking, consent). Won't fire
 * on hideOnPaths (default: contact + thanks pages).
 *
 * Configure with:
 *   <script type="application/json" id="aed-exit-intent-config">
 *   { "headline": "...", "body": "...",
 *     "primary": { "label": "See pricing", "href": "/pricing/" },
 *     "secondary": { "label": "No thanks", "dismiss": "session" } }
 *   </script>
 *
 * API:
 *   window.__exitIntent.show()   force-open
 *   window.__exitIntent.hide()
 *   window.__exitIntent.reset()  wipe storage flags + arm again
 *
 * See /exit-intent/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var SS_FIRED = 'aed:exit-intent:fired';     // session-fire fuse
  var LS_DISMISS = 'aed:exit-intent:dismissed'; // permanent dismiss

  var enabled = (function () {
    var meta = document.querySelector('meta[name="aed:exit-intent"]');
    if (!meta) return false;
    var v = (meta.getAttribute('content') || '').toLowerCase();
    return v === 'on' || v === 'true' || v === '1';
  })();
  if (!enabled) return;

  var defaults = {
    eyebrow: 'Wait',
    headline: 'Before you go…',
    body: 'Got 30 seconds? See if we\'d be a fit — no pitch, no pressure.',
    primary: { label: 'Learn more', href: '/' },
    secondary: { label: 'No thanks', dismiss: 'session' },
    dwellMs: 4000,           // wait this long after load before arming
    minScrollPercent: 0,     // require this much engagement (0–100)
    hideOnPaths: ['/contact/', '/thanks/', '/start/'],
  };

  var config = Object.assign({}, defaults);
  (function loadConfig() {
    var el = document.getElementById('aed-exit-intent-config');
    if (!el) return;
    try {
      var cfg = JSON.parse(el.textContent || '{}');
      if (cfg.primary) cfg.primary = Object.assign({}, defaults.primary, cfg.primary);
      if (cfg.secondary) cfg.secondary = Object.assign({}, defaults.secondary, cfg.secondary);
      Object.keys(cfg).forEach(function (k) { config[k] = cfg[k]; });
    } catch (_) {}
  })();

  // -- Hide-on-path -----------------------------------------------------
  var path = window.location.pathname;
  for (var i = 0; i < config.hideOnPaths.length; i++) {
    var p = config.hideOnPaths[i];
    if (path === p || path === p + '/' || (p.endsWith('/') && path === p.slice(0, -1))) return;
  }

  // -- Storage gates ----------------------------------------------------
  try { if (sessionStorage.getItem(SS_FIRED) === '1') return; } catch (_) {}
  try { if (localStorage.getItem(LS_DISMISS) === '1') return; } catch (_) {}

  // -- State ------------------------------------------------------------
  var armed = false;
  var loadedAt = Date.now();
  var modal = null;
  var maxScroll = 0;
  var lastScrollY = window.scrollY;
  var lastScrollAt = Date.now();

  function scrollPercent() {
    var doc = document.documentElement;
    var win = window.innerHeight || doc.clientHeight;
    var max = (doc.scrollHeight - win) || 1;
    return Math.max(0, Math.min(100, (window.scrollY / max) * 100));
  }

  // -- Suppression: any other overlay currently open? -------------------
  function otherOverlayOpen() {
    return !!document.querySelector(
      '.consent-banner.is-open,' +
      '.consent-scrim.is-open,' +
      '.contact-fab-panel.is-open,' +
      '.aed-booking-scrim.is-open,' +
      '.aed-form-success'                       // user just submitted a form
    );
  }

  // -- Fire -------------------------------------------------------------
  function trigger(reason) {
    if (!armed || otherOverlayOpen()) return;
    armed = false;
    try { sessionStorage.setItem(SS_FIRED, '1'); } catch (_) {}
    show();
    document.dispatchEvent(new CustomEvent('aed:exit-intent:trigger', { detail: { reason: reason } }));
  }

  function show() {
    build();
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('is-open'); });
    document.addEventListener('keydown', escClose);
    document.body.style.overflow = 'hidden';
  }

  function hide(persistKind) {
    if (!modal) return;
    modal.classList.remove('is-open');
    setTimeout(function () { if (modal) modal.hidden = true; }, 220);
    document.removeEventListener('keydown', escClose);
    document.body.style.overflow = '';
    if (persistKind === 'permanent') {
      try { localStorage.setItem(LS_DISMISS, '1'); } catch (_) {}
    }
  }
  function escClose(e) { if (e.key === 'Escape') hide(); }

  function build() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'aed-exit-scrim';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'aed-exit-headline');
    modal.hidden = true;
    modal.addEventListener('click', function (e) {
      if (e.target === modal) hide(); // click-outside, no persist
    });

    var inner = document.createElement('div');
    inner.className = 'aed-exit-modal';

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'aed-exit-modal-close';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg>';
    close.addEventListener('click', function () { hide(); });
    inner.appendChild(close);

    if (config.eyebrow) {
      var eb = document.createElement('span');
      eb.className = 'aed-exit-modal-eyebrow';
      eb.textContent = config.eyebrow;
      inner.appendChild(eb);
    }

    var h = document.createElement('h2');
    h.id = 'aed-exit-headline';
    h.className = 'aed-exit-modal-headline';
    h.textContent = config.headline;
    inner.appendChild(h);

    var b = document.createElement('p');
    b.className = 'aed-exit-modal-body';
    b.textContent = config.body;
    inner.appendChild(b);

    var actions = document.createElement('div');
    actions.className = 'aed-exit-modal-actions';

    if (config.primary && config.primary.label) {
      var primary = makeAction(config.primary, 'aed-exit-btn aed-exit-btn-primary');
      actions.appendChild(primary);
    }
    if (config.secondary && config.secondary.label) {
      var secondary = makeAction(config.secondary, 'aed-exit-btn aed-exit-btn-ghost');
      actions.appendChild(secondary);
    }
    inner.appendChild(actions);
    modal.appendChild(inner);
    document.body.appendChild(modal);
    return modal;
  }

  function makeAction(cfg, klass) {
    // Plain button if no href; anchor if href
    var el;
    if (cfg.href) {
      el = document.createElement('a');
      el.href = cfg.href;
      if (cfg.target) el.target = cfg.target;
    } else {
      el = document.createElement('button');
      el.type = 'button';
    }
    el.className = klass;
    el.textContent = cfg.label;
    el.addEventListener('click', function () {
      // If "dismiss" is set, treat as no-op close. Otherwise let nav/href happen.
      if (cfg.dismiss === 'permanent') hide('permanent');
      else if (cfg.dismiss) hide();
      else if (!cfg.href) hide();
    });
    return el;
  }

  // -- Detection: arm after dwell + scroll engagement ------------------
  function tryArm() {
    if (armed) return;
    if (Date.now() - loadedAt < config.dwellMs) return;
    if (config.minScrollPercent > 0 && maxScroll < config.minScrollPercent) return;
    armed = true;

    // Desktop: mouse exit
    document.documentElement.addEventListener('mouseleave', onMouseLeave);

    // Mobile: scroll-up burst (>= 12px in <300ms after dwell)
    if ('ontouchstart' in window) {
      window.addEventListener('scroll', onMobileScrollUp, { passive: true });
    }
  }

  function onMouseLeave(e) {
    // Only fire when crossing the *top* edge — sideways doesn't count
    if (e.clientY > 0) return;
    trigger('mouseleave-top');
  }

  function onMobileScrollUp() {
    var now = Date.now();
    var y = window.scrollY;
    var delta = lastScrollY - y;
    var dt = now - lastScrollAt;
    lastScrollY = y;
    lastScrollAt = now;
    if (delta >= 12 && dt < 300 && y < 80) {
      trigger('scroll-up-mobile');
    }
  }

  // -- Engagement tracking (for minScrollPercent) ----------------------
  function onScrollTrack() {
    var p = scrollPercent();
    if (p > maxScroll) maxScroll = p;
  }
  window.addEventListener('scroll', onScrollTrack, { passive: true });

  // -- Boot: defer until consent answered ------------------------------
  function start() {
    var pendingConsent = document.querySelector('.consent-banner:not([hidden])');
    if (pendingConsent) {
      document.addEventListener('aed:consent:change', function once() {
        document.removeEventListener('aed:consent:change', once);
        beginArmingWindow();
      });
    } else {
      beginArmingWindow();
    }
  }
  function beginArmingWindow() {
    // Re-zero the dwell timer at the moment we actually start watching
    loadedAt = Date.now();
    setTimeout(tryArm, config.dwellMs);
    // Also try arming again whenever scroll engagement hits the threshold
    if (config.minScrollPercent > 0) {
      window.addEventListener('scroll', function poll() {
        if (maxScroll >= config.minScrollPercent) {
          window.removeEventListener('scroll', poll);
          tryArm();
        }
      }, { passive: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.__exitIntent = {
    version: VERSION,
    show: function () { try { sessionStorage.setItem(SS_FIRED, '1'); } catch (_) {} show(); },
    hide: function () { hide(); },
    reset: function () {
      try { sessionStorage.removeItem(SS_FIRED); } catch (_) {}
      try { localStorage.removeItem(LS_DISMISS); } catch (_) {}
      armed = false;
      loadedAt = Date.now();
      setTimeout(tryArm, 100);
    },
    config: config,
  };
})();
