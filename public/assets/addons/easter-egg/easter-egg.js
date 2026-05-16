/*
 * Easter Egg — drop-in Konami-code reveal panel.
 *
 * Listens for the Konami sequence (↑↑↓↓←→←→ba) and pops up a small
 * configurable panel. Single-fire per session by default, with
 * "remember this" localStorage option.
 *
 * Configure with an inline JSON block (id from site.json json[]):
 *   {
 *     "emoji":     "🎉",
 *     "headline":  "You found it.",
 *     "body":      "Here's a 10% off code: GOMKS-EGG-10",
 *     "primary":   { "label": "Use it", "href": "/pricing/?promo=GOMKS-EGG-10" },
 *     "secondary": { "label": "No thanks", "dismiss": true },
 *     "sequence":  "konami",                    // "konami" | "iddqd" | custom string
 *     "fireOnce":  "session"                    // "session" | "permanent" | "never"
 *   }
 *
 * Public API:
 *   window.__egg.show()        — force-open
 *   window.__egg.hide()
 *   window.__egg.reset()       — clear the fired flag
 *   window.__egg.config        — resolved config
 *
 * See /easter-egg/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var SS_FIRED = 'aed:egg:fired';
  var LS_FIRED = 'aed:egg:fired:permanent';

  var SEQUENCES = {
    konami: ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'],
    iddqd:  ['i','d','d','q','d'],
  };

  var defaults = {
    emoji:     '🎉',
    headline:  'You found it.',
    body:      'Nice work — here\'s a thank you for sticking around.',
    primary:   null,
    secondary: { label: 'Cool', dismiss: true },
    sequence:  'konami',
    fireOnce:  'session',
  };

  var configEl = document.getElementById('aed-easter-egg');
  var config = Object.assign({}, defaults);
  if (configEl) {
    try {
      var loaded = JSON.parse(configEl.textContent || '{}');
      if (loaded.primary)   loaded.primary   = Object.assign({}, defaults.primary || {}, loaded.primary);
      if (loaded.secondary) loaded.secondary = Object.assign({}, defaults.secondary, loaded.secondary);
      Object.assign(config, loaded);
    } catch (_) {}
  }

  // -- Already fired? ------------------------------------------------
  function alreadyFired() {
    if (config.fireOnce === 'permanent') {
      try { return localStorage.getItem(LS_FIRED) === '1'; } catch (_) { return false; }
    }
    if (config.fireOnce === 'session') {
      try { return sessionStorage.getItem(SS_FIRED) === '1'; } catch (_) { return false; }
    }
    return false;
  }
  function markFired() {
    try {
      if (config.fireOnce === 'permanent') localStorage.setItem(LS_FIRED, '1');
      else if (config.fireOnce === 'session') sessionStorage.setItem(SS_FIRED, '1');
    } catch (_) {}
  }
  function clearFired() {
    try { sessionStorage.removeItem(SS_FIRED); localStorage.removeItem(LS_FIRED); } catch (_) {}
  }

  // -- Sequence detection -------------------------------------------
  function getSequence() {
    var src = config.sequence || 'konami';
    if (typeof src === 'string' && SEQUENCES[src]) return SEQUENCES[src];
    if (Array.isArray(src)) return src;
    if (typeof src === 'string') return src.split('');
    return SEQUENCES.konami;
  }

  var seq = getSequence();
  var pos = 0;
  document.addEventListener('keydown', function (e) {
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    var expected = seq[pos];
    var expLower = expected && expected.length === 1 ? expected.toLowerCase() : expected;
    if (key === expLower) {
      pos += 1;
      if (pos >= seq.length) {
        pos = 0;
        if (!alreadyFired()) {
          markFired();
          show();
        } else {
          show();  // re-show on subsequent triggers without re-marking
        }
      }
    } else {
      // Reset progress, but allow restarting if this key is the first in sequence
      pos = (key === (seq[0].length === 1 ? seq[0].toLowerCase() : seq[0])) ? 1 : 0;
    }
  });

  // -- Panel build / show / hide ------------------------------------
  var scrim = null;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function build() {
    if (scrim) return scrim;
    scrim = document.createElement('div');
    scrim.className = 'aed-egg-scrim';
    scrim.setAttribute('role', 'dialog');
    scrim.setAttribute('aria-modal', 'true');
    scrim.setAttribute('aria-label', config.headline);
    scrim.hidden = true;
    scrim.addEventListener('click', function (e) { if (e.target === scrim) hide(); });

    var html =
      '<div class="aed-egg-panel">' +
        '<button type="button" class="aed-egg-close" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
        (config.emoji ? '<div class="aed-egg-emoji" aria-hidden="true">' + escapeHtml(config.emoji) + '</div>' : '') +
        '<h2 class="aed-egg-headline">' + escapeHtml(config.headline) + '</h2>' +
        '<p class="aed-egg-body">' + escapeHtml(config.body) + '</p>' +
        '<div class="aed-egg-actions"></div>' +
      '</div>';
    scrim.innerHTML = html;

    var actions = scrim.querySelector('.aed-egg-actions');
    if (config.primary && config.primary.label) actions.appendChild(makeAction(config.primary, ''));
    if (config.secondary && config.secondary.label) actions.appendChild(makeAction(config.secondary, 'aed-egg-cta-ghost'));

    scrim.querySelector('.aed-egg-close').addEventListener('click', hide);
    document.body.appendChild(scrim);
    return scrim;
  }

  function makeAction(cfg, extraClass) {
    var el;
    if (cfg.href) {
      el = document.createElement('a');
      el.href = cfg.href;
      if (cfg.target) el.target = cfg.target;
    } else {
      el = document.createElement('button');
      el.type = 'button';
    }
    el.className = 'aed-egg-cta ' + (extraClass || '');
    el.textContent = cfg.label;
    el.addEventListener('click', function () { if (cfg.dismiss) hide(); });
    return el;
  }

  function show() {
    build();
    scrim.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add('is-open'); });
    document.addEventListener('keydown', escClose);
  }
  function hide() {
    if (!scrim) return;
    scrim.classList.remove('is-open');
    setTimeout(function () { if (scrim) scrim.hidden = true; }, 220);
    document.removeEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') hide(); }

  window.__egg = {
    version: VERSION,
    show: show,
    hide: hide,
    reset: clearFired,
    config: config,
  };
})();
