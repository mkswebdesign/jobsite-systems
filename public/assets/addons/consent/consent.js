/*
 * Consent — drop-in cookie / privacy preferences.
 *
 * Stores user choices in localStorage and fires events that other
 * add-ons can listen for. Renders a bottom banner on first visit and
 * a customize modal on demand. See /consent/README.md.
 *
 * Public API:
 *   window.__consent.get(category)        -> boolean
 *   window.__consent.getAll()             -> { necessary, analytics, marketing }
 *   window.__consent.set(partial)         -> merges + persists + fires events
 *   window.__consent.acceptAll()          -> shortcut
 *   window.__consent.rejectAll()          -> shortcut (necessary stays true)
 *   window.__consent.open()               -> open customize modal
 *   window.__consent.reset()              -> wipe + reshow banner (testing)
 *   window.__consent.onChange(fn)         -> subscribe to changes
 *
 * Events on `document`:
 *   'aed:consent:ready'  detail = { choices, hasChosen }
 *   'aed:consent:change' detail = { choices, prev }
 *
 * Auto-gating of third-party scripts:
 *   <script data-aed-consent="analytics" data-consent-src="https://...">
 *   When the named category is granted, the script's `src` is set and
 *   the browser loads it. Until then it does nothing.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var STORAGE_KEY = 'aed:consent';
  var POLICY_VERSION = 1; // bump to force re-prompt after a policy change

  var DEFAULTS = {
    necessary: true,
    analytics: false,
    marketing: false,
  };

  var COPY = {
    bannerTitle: 'Your privacy',
    bannerBody: 'We use cookies for essential site functions. Optional analytics help us improve. You can change this anytime via "Cookie preferences" in the footer.',
    privacyLink: '/privacy/',
    privacyLabel: 'Privacy policy',
    acceptAll: 'Accept all',
    rejectAll: 'Reject all',
    customize: 'Customize',
    modalTitle: 'Cookie preferences',
    modalIntro: 'Choose which categories you allow. Necessary cookies are always on — without them the site cannot function.',
    save: 'Save preferences',
    cancel: 'Cancel',
    close: 'Close',
  };

  var CATEGORIES = [
    { id: 'necessary', name: 'Necessary',
      desc: 'Required for the site to load and remember your settings (theme, consent). Cannot be disabled.',
      locked: true },
    { id: 'analytics', name: 'Analytics',
      desc: 'Anonymous usage data so we can see which pages help and which don\'t. No tracking across sites.' },
    { id: 'marketing', name: 'Marketing',
      desc: 'Used by ad / retargeting scripts. Off by default. (Currently no marketing scripts are loaded on this site.)' },
  ];

  // -- Optional config override via inline JSON ---------------------------
  (function loadConfig() {
    var el = document.getElementById('aed-consent-config');
    if (!el) return;
    try {
      var cfg = JSON.parse(el.textContent || '{}');
      if (cfg.copy) Object.assign(COPY, cfg.copy);
      if (Array.isArray(cfg.categories)) {
        // Allow host to override category metadata (name + desc) but not ids
        cfg.categories.forEach(function (c) {
          var existing = CATEGORIES.find(function (x) { return x.id === c.id; });
          if (existing) Object.assign(existing, c);
        });
      }
    } catch (_) {}
  })();

  // -- Storage ------------------------------------------------------------
  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== POLICY_VERSION) return null; // policy bumped → re-prompt
      return parsed;
    } catch (_) { return null; }
  }
  function write(choices) {
    var record = { v: POLICY_VERSION, ts: new Date().toISOString(), choices: choices };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch (_) {}
    return record;
  }
  function clear() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  // -- State --------------------------------------------------------------
  var state = (function init() {
    var existing = read();
    return existing ? Object.assign({}, DEFAULTS, existing.choices) : Object.assign({}, DEFAULTS);
  })();
  var hasChosen = !!read();
  var listeners = [];

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail }));
  }

  function commit(next, prev) {
    next.necessary = true; // can never be revoked
    state = Object.assign({}, state, next);
    write(state);
    hasChosen = true;
    activateGatedScripts();
    listeners.forEach(function (fn) { try { fn(state, prev); } catch (_) {} });
    emit('aed:consent:change', { choices: clone(state), prev: clone(prev) });
  }
  function clone(o) { return Object.assign({}, o); }

  // -- Auto-gating of <script data-aed-consent="<cat>"> ------------------
  function activateGatedScripts() {
    var nodes = document.querySelectorAll('script[data-aed-consent][data-consent-src]');
    nodes.forEach(function (node) {
      var cat = node.getAttribute('data-aed-consent');
      if (!state[cat]) return;
      var src = node.getAttribute('data-consent-src');
      if (!src || node.src === src) return;
      // Replace the placeholder with a fresh script — assigning .src on an
      // already-parsed inline script does nothing in most browsers.
      var fresh = document.createElement('script');
      Array.prototype.slice.call(node.attributes).forEach(function (a) {
        if (a.name === 'data-consent-src') return;
        fresh.setAttribute(a.name, a.value);
      });
      fresh.src = src;
      fresh.async = node.async;
      fresh.defer = node.defer;
      node.parentNode.replaceChild(fresh, node);
    });
  }

  // -- DOM construction --------------------------------------------------
  var bannerEl = null;
  var scrimEl = null;

  function buildBanner() {
    if (bannerEl) return bannerEl;
    var wrap = document.createElement('div');
    wrap.className = 'consent-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', COPY.modalTitle);
    wrap.hidden = true;

    var copyBlock = document.createElement('div');
    copyBlock.className = 'consent-banner-copy';
    var bodyText = COPY.bannerBody;
    var bodyHtml = escapeHtml(bodyText);
    if (COPY.privacyLink) {
      bodyHtml += ' <a href="' + escapeAttr(COPY.privacyLink) + '">' + escapeHtml(COPY.privacyLabel) + '</a>.';
    }
    copyBlock.innerHTML =
      '<strong>' + escapeHtml(COPY.bannerTitle) + '</strong>' + bodyHtml;
    wrap.appendChild(copyBlock);

    var actions = document.createElement('div');
    actions.className = 'consent-banner-actions';
    actions.appendChild(makeBtn(COPY.rejectAll, 'consent-btn-ghost', api.rejectAll));
    actions.appendChild(makeBtn(COPY.customize, 'consent-btn-ghost', api.open));
    actions.appendChild(makeBtn(COPY.acceptAll, 'consent-btn-primary', api.acceptAll));
    wrap.appendChild(actions);

    document.body.appendChild(wrap);
    bannerEl = wrap;
    return wrap;
  }

  function makeBtn(label, klass, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'consent-btn ' + klass;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  function showBanner() {
    var b = buildBanner();
    b.hidden = false;
    requestAnimationFrame(function () { b.classList.add('is-open'); });
  }
  function hideBanner() {
    if (!bannerEl) return;
    bannerEl.classList.remove('is-open');
    setTimeout(function () { if (bannerEl) bannerEl.hidden = true; }, 250);
  }

  function buildModal() {
    if (scrimEl) return scrimEl;
    var scrim = document.createElement('div');
    scrim.className = 'consent-scrim';
    scrim.hidden = true;
    scrim.addEventListener('click', function (e) {
      if (e.target === scrim) closeModal();
    });

    var modal = document.createElement('div');
    modal.className = 'consent-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'consent-modal-title');

    var header = document.createElement('div');
    header.className = 'consent-modal-header';
    var title = document.createElement('h2');
    title.className = 'consent-modal-title';
    title.id = 'consent-modal-title';
    title.textContent = COPY.modalTitle;
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'consent-modal-close';
    close.setAttribute('aria-label', COPY.close);
    close.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg>';
    close.addEventListener('click', closeModal);
    header.appendChild(title);
    header.appendChild(close);
    modal.appendChild(header);

    var intro = document.createElement('p');
    intro.className = 'consent-modal-intro';
    intro.textContent = COPY.modalIntro;
    modal.appendChild(intro);

    var list = document.createElement('div');
    list.className = 'consent-categories';
    CATEGORIES.forEach(function (c) {
      var row = document.createElement('label');
      row.className = 'consent-cat';
      row.setAttribute('for', 'consent-cat-' + c.id);

      var info = document.createElement('div');
      info.className = 'consent-cat-info';
      var n = document.createElement('span');
      n.className = 'consent-cat-name';
      n.textContent = c.name + (c.locked ? ' (always on)' : '');
      var d = document.createElement('span');
      d.className = 'consent-cat-desc';
      d.textContent = c.desc;
      info.appendChild(n);
      info.appendChild(d);
      row.appendChild(info);

      var sw = document.createElement('span');
      sw.className = 'consent-switch';
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.id = 'consent-cat-' + c.id;
      input.dataset.cat = c.id;
      input.checked = !!state[c.id] || !!c.locked;
      if (c.locked) input.disabled = true;
      var track = document.createElement('span');
      track.className = 'consent-switch-track';
      var thumb = document.createElement('span');
      thumb.className = 'consent-switch-thumb';
      sw.appendChild(input);
      sw.appendChild(track);
      sw.appendChild(thumb);
      row.appendChild(sw);

      list.appendChild(row);
    });
    modal.appendChild(list);

    var actions = document.createElement('div');
    actions.className = 'consent-modal-actions';
    actions.appendChild(makeBtn(COPY.cancel, 'consent-btn-ghost', closeModal));
    actions.appendChild(makeBtn(COPY.save, 'consent-btn-primary', saveFromModal));
    modal.appendChild(actions);

    scrim.appendChild(modal);
    document.body.appendChild(scrim);
    scrimEl = scrim;
    return scrim;
  }

  function openModal() {
    var s = buildModal();
    // Sync inputs with current state in case it changed since build
    s.querySelectorAll('input[data-cat]').forEach(function (i) {
      i.checked = !!state[i.dataset.cat] || CATEGORIES.find(function (c) { return c.id === i.dataset.cat; }).locked;
    });
    s.hidden = false;
    requestAnimationFrame(function () { s.classList.add('is-open'); });
    document.addEventListener('keydown', escClose);
  }
  function closeModal() {
    if (!scrimEl) return;
    scrimEl.classList.remove('is-open');
    setTimeout(function () { if (scrimEl) scrimEl.hidden = true; }, 200);
    document.removeEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') closeModal(); }

  function saveFromModal() {
    var prev = clone(state);
    var next = {};
    scrimEl.querySelectorAll('input[data-cat]').forEach(function (i) {
      next[i.dataset.cat] = i.checked;
    });
    commit(next, prev);
    closeModal();
    hideBanner();
  }

  // -- Public API --------------------------------------------------------
  var api = {
    version: VERSION,
    get: function (cat) { return !!state[cat]; },
    getAll: function () { return clone(state); },
    set: function (partial) {
      var prev = clone(state);
      commit(Object.assign({}, state, partial), prev);
    },
    acceptAll: function () {
      var prev = clone(state);
      var next = {};
      CATEGORIES.forEach(function (c) { next[c.id] = true; });
      commit(next, prev);
      hideBanner();
    },
    rejectAll: function () {
      var prev = clone(state);
      var next = {};
      CATEGORIES.forEach(function (c) { next[c.id] = !!c.locked; });
      commit(next, prev);
      hideBanner();
    },
    open: openModal,
    close: closeModal,
    reset: function () {
      clear();
      state = Object.assign({}, DEFAULTS);
      hasChosen = false;
      showBanner();
    },
    onChange: function (fn) {
      if (typeof fn === 'function') listeners.push(fn);
      return function off() {
        listeners = listeners.filter(function (x) { return x !== fn; });
      };
    },
  };
  window.__consent = api;

  // -- Helpers -----------------------------------------------------------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // -- Boot --------------------------------------------------------------
  function boot() {
    // Wire any [data-consent-open] triggers in the page (e.g. footer link)
    document.querySelectorAll('[data-consent-open]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        openModal();
      });
    });

    // Activate any scripts the user already granted on prior visits
    if (hasChosen) activateGatedScripts();

    // Show banner if no choice made yet
    if (!hasChosen) showBanner();

    emit('aed:consent:ready', { choices: clone(state), hasChosen: hasChosen });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
