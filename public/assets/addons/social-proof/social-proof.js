/*
 * Social Proof — drop-in rotating activity toasts.
 *
 * Reads a feed (inline JSON or fetched URL) and rotates toasts in the
 * bottom-left, with sensible dwell + interval + cycle limits. Honest
 * defaults: no auto-generated fake names; you supply the items.
 *
 * Configure via inline JSON feed:
 *   <script type="application/json" id="aed-social-proof-feed">
 *   [
 *     { "text": "Currently accepting **3** new clients this quarter", "icon": "users" },
 *     { "text": "New intro call · 2 days ago", "icon": "calendar", "href": "/contact/" }
 *   ]
 *   </script>
 *
 * Or fetched URL:
 *   <meta name="aed:social-proof" content="/data/recent-activity.json">
 *
 * Optional behavior config:
 *   <script type="application/json" id="aed-social-proof-config">
 *   { "dwellMs": 8000, "displayMs": 6000, "intervalMs": 12000,
 *     "maxCycles": 3, "shuffle": false, "hideOnPaths": ["/contact/"] }
 *   </script>
 *
 * Public API:
 *   window.__socialProof.show()     — force the next toast immediately
 *   window.__socialProof.hide()
 *   window.__socialProof.pause()    — stop the cycle until resume()
 *   window.__socialProof.resume()
 *   window.__socialProof.reset()    — wipe dismiss flag, re-arm
 *
 * See /social-proof/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var SS_DISMISS = 'aed:social-proof:dismissed';

  // -- Config -----------------------------------------------------------
  var defaults = {
    dwellMs: 8000,           // wait this long after page load before first toast
    displayMs: 6000,         // each toast visible this long
    intervalMs: 12000,       // gap between toasts (start to start)
    maxCycles: 3,            // stop after this many full passes through the feed
    shuffle: false,          // randomize item order
    hideOnPaths: [],         // paths where toasts shouldn't show
  };
  var config = Object.assign({}, defaults);
  (function loadConfig() {
    var el = document.getElementById('aed-social-proof-config');
    if (!el) return;
    try { Object.assign(config, JSON.parse(el.textContent || '{}')); } catch (_) {}
  })();

  // -- Hide-on-path -----------------------------------------------------
  var path = window.location.pathname;
  for (var i = 0; i < config.hideOnPaths.length; i++) {
    var p = config.hideOnPaths[i];
    if (path === p || path === p + '/' || (p.endsWith('/') && path === p.slice(0, -1))) return;
  }

  // -- Dismissed this session? -----------------------------------------
  try { if (sessionStorage.getItem(SS_DISMISS) === '1') return; } catch (_) {}

  // -- Feed loading -----------------------------------------------------
  function loadFeed() {
    var inline = document.getElementById('aed-social-proof-feed');
    if (inline) {
      try { return Promise.resolve(JSON.parse(inline.textContent || '[]')); }
      catch (_) { return Promise.resolve([]); }
    }
    var meta = document.querySelector('meta[name="aed:social-proof"]');
    if (meta) {
      var url = meta.getAttribute('content');
      if (url) return fetch(url).then(function (r) { return r.json(); }).catch(function () { return []; });
    }
    return Promise.resolve([]);
  }

  // -- Icons ------------------------------------------------------------
  var ICONS = {
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    sparkle: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>',
    bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || ICONS.sparkle) + '</svg>';
  }

  // Lightweight inline-markdown for **bold**
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function renderText(s) {
    return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  // -- DOM --------------------------------------------------------------
  var current = null;
  function build(item) {
    if (current) { current.remove(); current = null; }
    var el;
    if (item.href) {
      el = document.createElement('a');
      el.href = item.href;
    } else {
      el = document.createElement('div');
    }
    el.className = 'aed-sp-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');

    var ic = document.createElement('span');
    ic.className = 'aed-sp-icon';
    ic.innerHTML = svg(item.icon || 'sparkle');
    el.appendChild(ic);

    var t = document.createElement('span');
    t.className = 'aed-sp-text';
    t.innerHTML = renderText(item.text || '');
    el.appendChild(t);

    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'aed-sp-close';
    x.setAttribute('aria-label', 'Dismiss');
    x.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg>';
    x.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      try { sessionStorage.setItem(SS_DISMISS, '1'); } catch (_) {}
      hideCurrent();
      stopped = true;
    });
    el.appendChild(x);

    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-open'); });
    current = el;
    return el;
  }

  function hideCurrent() {
    if (!current) return;
    var el = current;
    current = null;
    el.classList.remove('is-open');
    setTimeout(function () { el.remove(); }, 280);
  }

  // -- Cycle scheduler --------------------------------------------------
  var feed = [];
  var idx = 0;
  var cycle = 0;
  var stopped = false;
  var paused = false;
  var nextTimer = null;

  function nextItem() {
    if (!feed.length) return null;
    if (config.shuffle) return feed[Math.floor(Math.random() * feed.length)];
    var item = feed[idx % feed.length];
    idx += 1;
    if (idx > 0 && idx % feed.length === 0) cycle += 1;
    return item;
  }

  function tick() {
    if (stopped || paused) return;
    if (cycle >= config.maxCycles) return;
    var item = nextItem();
    if (!item) return;
    build(item);
    setTimeout(hideCurrent, config.displayMs);
    nextTimer = setTimeout(tick, config.intervalMs);
  }

  function arm() {
    if (stopped) return;
    nextTimer = setTimeout(tick, config.dwellMs);
  }
  function disarm() {
    if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
  }

  // -- Page Visibility: pause when tab hidden ---------------------------
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { paused = true; disarm(); hideCurrent(); }
    else if (paused) { paused = false; arm(); }
  });

  // -- Boot: defer until consent answered ------------------------------
  function start() {
    loadFeed().then(function (items) {
      if (!Array.isArray(items) || !items.length) return;
      feed = items;
      var pendingConsent = document.querySelector('.consent-banner:not([hidden])');
      if (pendingConsent) {
        document.addEventListener('aed:consent:change', function once() {
          document.removeEventListener('aed:consent:change', once);
          arm();
        });
      } else {
        arm();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.__socialProof = {
    version: VERSION,
    show: function () { disarm(); tick(); },
    hide: hideCurrent,
    pause: function () { paused = true; disarm(); },
    resume: function () { paused = false; arm(); },
    reset: function () {
      try { sessionStorage.removeItem(SS_DISMISS); } catch (_) {}
      stopped = false; idx = 0; cycle = 0;
      disarm(); arm();
    },
    get config() { return config; },
    get feed() { return feed.slice(); },
  };
})();
