/*
 * Announcement Bar — drop-in top-of-page strip.
 *
 * Reads a single announcement from inline JSON. Optional start/end
 * dates schedule when it shows. Per-id dismiss persists in localStorage
 * so users don't see the same banner twice.
 *
 * Configure with:
 *   <script type="application/json" id="aed-announcement-bar">
 *   { "id": "q2-launch",
 *     "kind": "promo",
 *     "icon": "sparkle",
 *     "text": "**Just launched:** new productized service.",
 *     "cta": { "label": "Read more", "href": "/about/" },
 *     "start": "2026-04-19", "end": "2026-05-19",
 *     "dismissable": true,
 *     "hideOnPaths": ["/contact/"] }
 *   </script>
 *
 * Public API:
 *   window.__announcement.show()
 *   window.__announcement.hide()
 *   window.__announcement.reset()   — clear dismiss flag
 *   window.__announcement.config    — resolved config
 *
 * See /announcement-bar/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var LS_PREFIX = 'aed:announcement:dismissed:';

  // -- Load config ------------------------------------------------------
  var configEl = document.getElementById('aed-announcement-bar');
  if (!configEl) return;

  var config;
  try { config = JSON.parse(configEl.textContent || '{}'); }
  catch (_) { return; }
  if (!config || !config.text) return;

  // Default fields
  config.id = config.id || hashString(config.text);
  config.kind = config.kind || 'promo';
  config.dismissable = config.dismissable !== false;
  config.hideOnPaths = config.hideOnPaths || [];
  config.showOnlyOnPaths = config.showOnlyOnPaths || null;  // null = all paths
  config.position = (config.position === 'bottom') ? 'bottom' : 'top';
  config.dismissCooldownDays = typeof config.dismissCooldownDays === 'number' && config.dismissCooldownDays > 0
    ? config.dismissCooldownDays : 0;  // 0 = permanent dismiss

  // -- Schedule check ---------------------------------------------------
  var now = Date.now();
  if (config.start && now < parseDate(config.start)) return;
  if (config.end && now > parseDate(config.end)) return;

  function parseDate(v) {
    var t = Date.parse(v);
    return isNaN(t) ? 0 : t;
  }

  // -- Path filtering --------------------------------------------------
  // Supports exact paths ("/contact/") and trailing "*" glob for prefix
  // matches ("/demo/*"). Prefix mode covers the base WITH and WITHOUT a
  // trailing slash plus every sub-path, so "/demo/*" hides on
  // "/demo", "/demo/", and "/demo/flinthills/services/".
  var path = window.location.pathname;
  function pathMatches(p) {
    if (typeof p !== 'string' || !p) return false;
    if (p.endsWith('*')) {
      var bare = p.slice(0, -1).replace(/\/$/, '');
      return path === bare || path === bare + '/' || path.indexOf(bare + '/') === 0;
    }
    return path === p || path === p + '/' || (p.endsWith('/') && path === p.slice(0, -1));
  }
  for (var i = 0; i < config.hideOnPaths.length; i++) {
    if (pathMatches(config.hideOnPaths[i])) return;
  }
  if (config.showOnlyOnPaths) {
    var matched = false;
    for (var j = 0; j < config.showOnlyOnPaths.length; j++) {
      if (pathMatches(config.showOnlyOnPaths[j])) { matched = true; break; }
    }
    if (!matched) return;
  }

  // -- Dismissed previously? -------------------------------------------
  try {
    var raw = localStorage.getItem(LS_PREFIX + config.id);
    if (raw) {
      if (config.dismissCooldownDays > 0) {
        var ts = parseInt(raw, 10);
        var ageMs = Date.now() - ts;
        var cooldownMs = config.dismissCooldownDays * 86400000;
        if (!isNaN(ts) && ageMs < cooldownMs) return;
        // Cooldown expired — clear and continue showing
        localStorage.removeItem(LS_PREFIX + config.id);
      } else if (raw === '1') {
        return;
      }
    }
  } catch (_) {}

  // -- Build -----------------------------------------------------------
  var ICONS = {
    sparkle: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    warn: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || ICONS.sparkle) + '</svg>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function renderText(s) {
    return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function hashString(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    return 'auto-' + Math.abs(h);
  }

  var el = null;
  function build() {
    el = document.createElement('div');
    el.className = 'aed-announcement aed-announcement--' + config.position;
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Site announcement');
    el.setAttribute('data-aed-kind', config.kind);
    el.setAttribute('data-aed-position', config.position);
    el.setAttribute('data-aed-id', config.id);

    if (config.icon) {
      var ic = document.createElement('span');
      ic.className = 'aed-announcement-icon';
      ic.innerHTML = svg(config.icon);
      el.appendChild(ic);
    }

    var t = document.createElement('span');
    t.className = 'aed-announcement-text';
    t.innerHTML = renderText(config.text);
    el.appendChild(t);

    if (config.cta && config.cta.label && config.cta.href) {
      var cta = document.createElement('a');
      cta.className = 'aed-announcement-cta';
      cta.href = config.cta.href;
      if (config.cta.target) cta.target = config.cta.target;
      cta.textContent = config.cta.label;
      el.appendChild(cta);
    }

    if (config.dismissable) {
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'aed-announcement-close';
      x.setAttribute('aria-label', 'Dismiss announcement');
      x.innerHTML = svg('close');
      x.addEventListener('click', dismiss);
      el.appendChild(x);
    }

    if (config.position === 'bottom') {
      document.body.appendChild(el);
    } else {
      document.body.insertBefore(el, document.body.firstChild);
    }
    measure();
    document.body.classList.add('aed-has-announcement');
    document.body.classList.add('aed-has-announcement--' + config.position);
  }

  function measure() {
    if (!el) return;
    var h = el.offsetHeight;
    var prop = config.position === 'bottom' ? '--aed-announcement-bottom-h' : '--aed-announcement-h';
    document.documentElement.style.setProperty(prop, h + 'px');
  }
  // Re-measure on resize (mobile may rewrap)
  var resizeRaf;
  window.addEventListener('resize', function () {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(measure);
  });

  function dismiss() {
    try {
      var v = config.dismissCooldownDays > 0 ? String(Date.now()) : '1';
      localStorage.setItem(LS_PREFIX + config.id, v);
    } catch (_) {}
    hide();
  }
  function hide() {
    if (!el) return;
    el.remove();
    el = null;
    document.documentElement.style.setProperty('--aed-announcement-h', '0px');
    document.documentElement.style.setProperty('--aed-announcement-bottom-h', '0px');
    document.body.classList.remove('aed-has-announcement');
    document.body.classList.remove('aed-has-announcement--top');
    document.body.classList.remove('aed-has-announcement--bottom');
  }
  function show() {
    if (el) return;
    build();
  }

  // -- Boot ------------------------------------------------------------
  function start() { build(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.__announcement = {
    version: VERSION,
    show: show,
    hide: hide,
    reset: function () {
      try { localStorage.removeItem(LS_PREFIX + config.id); } catch (_) {}
      show();
    },
    config: config,
  };
})();
