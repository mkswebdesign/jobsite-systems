/**
 * gomks builder — bootstrap loader
 * --------------------------------
 * Resolves auto-activation state (query params, force flag, IP allowlist,
 * keyboard chord), injects /assets/builder/editor/edit.js on approved devices, wires
 * up the optional [data-footer-edit] toggle anchor, and renders a persistent
 * approved-status FAB (green glow) that lets an approved user manifest the
 * editor at any time — critical on mobile where the keyboard chord doesn't
 * exist and auto-load can be flaky.
 *
 * Drop-in: copy the public/assets/builder/editor/ folder to a new site, edit
 * AED_CONFIG below, and load this script from your layout:
 *
 *   <script defer src="/assets/builder/editor/bootstrap.js"></script>
 */
(function () {
  // Visible in browser console so you can verify the new bootstrap ran
  // (vs. a stale cached copy). Bump BOOTSTRAP_VERSION whenever this file changes.
  var BOOTSTRAP_VERSION = '20260424-1';
  try { console.log('[aed] bootstrap v' + BOOTSTRAP_VERSION + ' loaded'); } catch (_) {}

  // ==== EDITOR CONFIG ==========================================
  // The editor is OPT-IN ONLY, gated behind the `?edit=1` query param (or
  // `?edit=force` for a persistent flag). No IP-based auto-activation —
  // shipping admin IPs to public HTML for the editor's auto-detect was
  // a credibility leak (audit, 2026-05-04). Admins bookmark the site
  // with `?edit=1` once on each device they edit from; localStorage
  // remembers the opt-in for that browser.
  var AED_CONFIG = {
    editorScript: '/assets/builder/editor/edit.js',
  };
  // ==== END CONFIG =============================================

  var KEY = 'aed:on';
  var FORCE = 'aed:force';
  var DEBUG = 'aed:debug';
  var log = function () {
    try {
      if (localStorage.getItem(DEBUG) === '1') console.log.apply(console, ['[aed]'].concat([].slice.call(arguments)));
    } catch (_) {}
  };

  // --- URL query handler -----------------------------------------
  var qs = new URLSearchParams(location.search);
  if (qs.has('edit')) {
    var v = qs.get('edit');
    try {
      if (v === 'force') {
        localStorage.setItem(FORCE, '1');
        localStorage.setItem(KEY, '1');
        log('force mode enabled');
      } else if (v === 'unforce') {
        localStorage.removeItem(FORCE);
        localStorage.removeItem(KEY);
        log('force mode cleared');
      } else if (v === 'debug') {
        localStorage.setItem(DEBUG, '1');
        console.log('[aed] debug mode enabled — reload to see logs');
      } else if (v === 'nodebug') {
        localStorage.removeItem(DEBUG);
      } else if (v === '1' || v === 'on' || v === '') {
        localStorage.setItem(KEY, '1');
        log('auto-load enabled');
      } else {
        localStorage.removeItem(KEY);
        log('auto-load disabled');
      }
    } catch (_) {}
    qs.delete('edit');
    var q = qs.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
  }

  // --- Loader + chord --------------------------------------------
  var loadAttempted = false;
  var loadFailed = false;
  function load(onReady) {
    log('loading editor');
    if (window.__arichEdit) {
      window.__arichEdit.toggle();
      if (onReady) onReady(true);
      return;
    }
    if (loadAttempted && !loadFailed) {
      // script element already in flight — just wait
      var waits = 0;
      var wait = setInterval(function () {
        if (window.__arichEdit || ++waits > 40) {
          clearInterval(wait);
          if (onReady) onReady(!!window.__arichEdit);
        }
      }, 100);
      return;
    }
    loadAttempted = true;
    loadFailed = false;
    var s = document.createElement('script');
    s.src = AED_CONFIG.editorScript + '?t=' + Date.now();
    s.onload = function () {
      log('editor script loaded');
      if (onReady) onReady(true);
    };
    s.onerror = function () {
      loadFailed = true;
      log('editor script FAILED to load', s.src);
      console.warn('[aed] editor failed to load — check that ' + AED_CONFIG.editorScript + ' is deployed');
      if (onReady) onReady(false);
    };
    document.body.appendChild(s);
  }

  function activate(reason) {
    log('activated via', reason);
    ensureFab();
    try { if (localStorage.getItem(KEY) === '1') load(); } catch (_) {}
    addEventListener('keydown', function (e) {
      if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        try { localStorage.setItem(KEY, '1'); } catch (_) {}
        load();
      }
    });
  }

  // --- Approved-status FAB ---------------------------------------
  // Green glowing button visible only to approved devices. Serves two jobs:
  //   (a) visible confirmation of approved/authenticated state
  //   (b) reliable one-tap entrypoint to manifest the editor when auto-load
  //       or keyboard chord isn't available (mobile)
  var fabEl = null;
  function ensureFab() {
    if (fabEl) return;
    // Skip the FAB on internal-fork tooling pages — the editor entrypoint is
    // already obvious there, so the lower-left dot is just noise.
    if (/^\/internal-fork(\/|$)/.test(location.pathname)) return;
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', ensureFab, { once: true });
      return;
    }
    if (!document.getElementById('aed-fab-style')) {
      var style = document.createElement('style');
      style.id = 'aed-fab-style';
      style.textContent = [
        '#aed-fab{position:fixed;bottom:.75rem;left:.75rem;z-index:2147483646;pointer-events:auto;opacity:.55;transition:opacity .2s ease}',
        '#aed-fab:hover{opacity:1}',
        '.aed-fab-btn{width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);color:transparent;border:0;padding:0;cursor:pointer;display:block;box-shadow:0 0 0 1px rgba(0,0,0,.2),0 1px 2px rgba(0,0,0,.2);transition:transform .15s ease,background .2s ease,box-shadow .2s ease;-webkit-tap-highlight-color:transparent}',
        '.aed-fab-btn:hover,.aed-fab-btn:focus-visible{transform:scale(1.4);outline:0}',
        '.aed-fab-btn svg{display:none}',
        '.aed-fab-btn.is-active{background:linear-gradient(135deg,#3b82f6,#2563eb)}',
        '.aed-fab-btn.is-error{background:linear-gradient(135deg,#ef4444,#b91c1c)}',
        '.aed-fab-label{display:none}',
        '#aed-fab[hidden]{display:none}',
      ].join('');
      document.head.appendChild(style);
    }
    fabEl = document.createElement('div');
    fabEl.id = 'aed-fab';
    fabEl.innerHTML =
      '<button class="aed-fab-btn" type="button" aria-label="Open editor — you are approved">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 20h9"/>' +
          '<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>' +
        '</svg>' +
      '</button>' +
      '<span class="aed-fab-label">Approved</span>';
    document.body.appendChild(fabEl);
    var btn = fabEl.querySelector('button');
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (window.__arichEdit) {
        window.__arichEdit.toggle();
        // Force panel visible if collapsed/hidden
        var panel = document.querySelector('.aed-panel');
        if (panel) { panel.classList.remove('aed-collapsed'); panel.style.display = ''; }
        return;
      }
      if (loadFailed) {
        // Allow a retry
        loadAttempted = false;
      }
      try { localStorage.setItem(KEY, '1'); } catch (_) {}
      load(function (ok) { if (!ok) syncFabState(); });
    });
    syncFabState();
    var polls = 0;
    var pollId = setInterval(function () {
      syncFabState();
      if (++polls > 60) clearInterval(pollId);
    }, 400);
  }
  function syncFabState() {
    if (!fabEl) return;
    var btn = fabEl.querySelector('.aed-fab-btn');
    var label = fabEl.querySelector('.aed-fab-label');
    if (!btn) return;
    btn.classList.remove('is-active', 'is-error');
    if (loadFailed) {
      btn.classList.add('is-error');
      btn.setAttribute('aria-label', 'Editor failed to load — tap to retry');
      if (label) label.textContent = 'Retry';
      return;
    }
    if (window.__arichEdit) {
      btn.classList.add('is-active');
      btn.setAttribute('aria-label', 'Editor loaded — tap to toggle panel');
      if (label) label.textContent = 'Active';
    } else {
      btn.setAttribute('aria-label', 'Approved — tap to open editor');
      if (label) label.textContent = 'Approved';
    }
  }

  // --- Activation flow: opt-in only ------------------------------
  // Activation requires an explicit signal from this browser:
  //   1. `?edit=force` set the FORCE flag → permanent until `?edit=unforce`
  //   2. `?edit=1` (or chord) set the KEY flag → activate this session
  // No IP check runs against ipify; no allowlist ships to public HTML.
  // Admins bookmark `<site>/?edit=1` on each device they edit from.
  var forced = false;
  var onlyKey = false;
  try {
    forced = localStorage.getItem(FORCE) === '1';
    onlyKey = !forced && localStorage.getItem(KEY) === '1';
  } catch (_) {}

  if (forced) {
    activate('force-flag');
  } else if (onlyKey) {
    activate('aed-on-flag');
  } else {
    log('editor inactive — visit ?edit=1 to enable on this device');
  }

  // --- Optional footer toggle anchor -----------------------------
  var footerLink = document.querySelector('[data-footer-edit]');
  if (!footerLink) return;

  // Reveal the footer Edit link only when an editor session exists
  // (force flag, opt-in flag, or the editor JS has manifested). Stays
  // hidden — including from the DOM-level `hidden` attribute set in
  // Footer.astro — for ordinary public visitors.
  function syncFooterVisibility() {
    var hasSession = false;
    try {
      hasSession = localStorage.getItem(KEY) === '1' || localStorage.getItem(FORCE) === '1';
    } catch (_) {}
    if (hasSession || !!window.__arichEdit) {
      footerLink.removeAttribute('hidden');
    } else {
      footerLink.setAttribute('hidden', '');
    }
  }

  function updateFooter() {
    var loaded = !!window.__arichEdit;
    var on = false, force = false;
    try {
      on = localStorage.getItem(KEY) === '1';
      force = localStorage.getItem(FORCE) === '1';
    } catch (_) {}
    syncFooterVisibility();
    if (loaded) {
      footerLink.textContent = 'Exit editor';
      footerLink.setAttribute('href', '#');
      footerLink.dataset.mode = 'exit-inplace';
    } else if (on || force) {
      footerLink.textContent = 'Exit editor';
      footerLink.setAttribute('href', '?edit=unforce');
      footerLink.dataset.mode = 'exit-reload';
    } else {
      footerLink.textContent = 'Edit';
      footerLink.setAttribute('href', '?edit=1');
      footerLink.dataset.mode = 'enter';
    }
  }
  footerLink.addEventListener('click', function (e) {
    if (footerLink.dataset.mode !== 'exit-inplace') return;
    if (!window.__arichEdit) return;
    e.preventDefault();
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(FORCE);
    } catch (_) {}
    window.__arichEdit.destroy();
    if (fabEl) { fabEl.remove(); fabEl = null; }
    updateFooter();
  });
  updateFooter();
  var polls = 0;
  var pollId = setInterval(function () {
    updateFooter();
    if (++polls > 16) clearInterval(pollId);
  }, 300);
})();
