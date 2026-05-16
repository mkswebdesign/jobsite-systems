/*
 * Animations — drop-in entrance motion.
 *
 * Opt-in via <meta name="aed:animations" content="on">. Scans the page
 * for elements with data-aed-fade-in / -up / -down / -left / -right /
 * -zoom-in / -zoom-out and attaches an IntersectionObserver. When an
 * element scrolls 15% into view, its `is-visible` class is added and
 * CSS handles the transition.
 *
 *   <h2 data-aed-fade-up>Headline</h2>
 *   <img data-aed-fade-up data-aed-delay="200">
 *   <ul data-aed-stagger-children data-aed-stagger="80">
 *     <li data-aed-fade-up>One</li>
 *     <li data-aed-fade-up>Two</li>
 *     <li data-aed-fade-up>Three</li>
 *   </ul>
 *   <div data-aed-fade-in data-aed-replay>I re-fire on every re-entry</div>
 *
 * Per-element knobs:
 *   data-aed-delay="ms"
 *   data-aed-duration="ms"
 *   data-aed-replay              animate every viewport entry, not once
 *
 * Per-parent stagger:
 *   data-aed-stagger-children            (parent) cascades children's delay
 *   data-aed-stagger="80"                (parent) ms per step (default 80)
 *
 * Per-page disable:
 *   <html data-aed-animations="off"> ... </html>
 *
 * Public API:
 *   window.__animations.refresh()   — re-scan after dynamic insert
 *   window.__animations.show(el)    — manually trigger
 *
 * See /animations/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.3.0';

  var meta = document.querySelector('meta[name="aed:animations"]');
  if (!meta) return;
  var v = (meta.getAttribute('content') || '').toLowerCase();
  if (v !== 'on' && v !== 'true' && v !== '1') return;
  if (document.documentElement.getAttribute('data-aed-animations') === 'off') return;

  var root = document.documentElement;

  // ---- Parsing helpers ----
  function readBool(attr, fallback) {
    var raw = meta.getAttribute(attr);
    if (raw === null) return fallback;
    raw = String(raw).toLowerCase();
    if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') return false;
    if (raw === 'true'  || raw === '1' || raw === 'yes' || raw === 'on')  return true;
    return fallback;
  }
  function readInt(attr) {
    var raw = meta.getAttribute(attr);
    if (!raw) return null;
    var n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  function readStr(attr) {
    var raw = meta.getAttribute(attr);
    return raw && raw.trim() ? raw.trim() : null;
  }

  // ---- Page transitions ----
  // Page-transition config flows into CSS variables on <html> that
  // base.css's body fade-in + .page-transition overlay consume. The
  // on/off toggle collapses durations to 0ms so transitions complete
  // instantly — equivalent to "off" without needing to rewrite rules.
  var pageTransitionsOn = readBool('data-page-transitions', true);
  var pageTxDuration = readInt('data-page-transition-duration-ms');
  var pageTxEasing   = readStr('data-page-transition-easing');
  var bodyFadeInMs   = readInt('data-body-fade-in-ms');
  if (!pageTransitionsOn) {
    // Zero every page-transition var; base.css uses var(..., fallback)
    // so these explicit 0s win over fallback defaults.
    root.style.setProperty('--page-transition-duration', '0ms');
    root.style.setProperty('--body-fade-in-duration', '0ms');
    root.classList.add('aed-no-page-transitions');
  } else {
    if (pageTxDuration !== null) root.style.setProperty('--page-transition-duration', pageTxDuration + 'ms');
    if (pageTxEasing)            root.style.setProperty('--page-transition-easing', pageTxEasing);
    if (bodyFadeInMs !== null)   root.style.setProperty('--body-fade-in-duration', bodyFadeInMs + 'ms');
  }

  // ---- Element-animation global on/off ----
  // When elementAnimationsOn is false, we add a class to <html> that
  // short-circuits the scroll-reveal CSS (see animations.css). Every
  // element is shown immediately with no entrance animation, but page
  // transitions still work independently.
  var elementAnimationsOn = readBool('data-element-animations', true);
  if (!elementAnimationsOn) {
    root.classList.add('aed-no-element-anims');
    // Don't bother wiring the IntersectionObserver — CSS already
    // forces visible state when the class is set.
    return;
  }

  // ---- Element-animation CSS variable defaults ----
  // Propagated from the addon's meta config to <html> so the CSS
  // transitions pick them up without requiring per-element inline
  // styles. Every per-element data-aed-* still wins at its own level.
  var durationN = readInt('data-default-duration-ms');
  if (durationN !== null) root.style.setProperty('--aed-anim-duration', durationN + 'ms');
  var easingStr = readStr('data-default-easing');
  if (easingStr) root.style.setProperty('--aed-anim-ease', easingStr);
  var distanceStr = readStr('data-translate-distance');
  if (distanceStr) root.style.setProperty('--aed-anim-distance', distanceStr);
  var zoomAttr = meta.getAttribute('data-zoom-scale');
  if (zoomAttr) {
    var zoomN = parseFloat(zoomAttr);
    if (Number.isFinite(zoomN) && zoomN > 0) {
      root.style.setProperty('--aed-anim-zoom-in', String(zoomN));
      root.style.setProperty('--aed-anim-zoom-out', String(2 - zoomN));
    }
  }

  // Per-page kill switch via config: disabledPages is a comma-separated
  // list of pathname prefixes. '/admin/' disables '/admin/users/' too.
  // Disables the ENTIRE addon (both element + page transitions). For
  // granular control, use data-element-animations / data-page-transitions.
  var disabledRaw = meta.getAttribute('data-disabled-pages') || '';
  if (disabledRaw) {
    var disabledList = disabledRaw.split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    var pathname = location.pathname;
    for (var di = 0; di < disabledList.length; di++) {
      if (pathname.indexOf(disabledList[di]) === 0) return;
    }
  }

  var respectReduced = readBool('data-respect-reduced-motion', true);
  var REDUCED = respectReduced && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var THRESHOLD = parseFloat(meta.getAttribute('data-threshold') || '0.15');
  // Site-wide default for replay-on-reentry. Per-element data-aed-replay
  // always wins; this sets the fallback when the element doesn't specify.
  var REPLAY_DEFAULT = readBool('data-replay-default', false);

  var SELECTOR = [
    '[data-aed-fade-in]',
    '[data-aed-fade-up]',
    '[data-aed-fade-down]',
    '[data-aed-fade-left]',
    '[data-aed-fade-right]',
    '[data-aed-zoom-in]',
    '[data-aed-zoom-out]',
  ].join(',');

  function applyInline(el) {
    var d = el.getAttribute('data-aed-delay');
    var dur = el.getAttribute('data-aed-duration');
    if (d) el.style.transitionDelay = parseInt(d, 10) + 'ms';
    if (dur) el.style.setProperty('--aed-anim-duration', parseInt(dur, 10) + 'ms');
  }

  function applyStagger(parent) {
    var per = parseInt(parent.getAttribute('data-aed-stagger') || '80', 10);
    var kids = parent.querySelectorAll(SELECTOR);
    var i = 0;
    kids.forEach(function (k) {
      // Only stagger direct-ish descendants — skip if a different stagger parent is between
      if (k.dataset.aedStaggered === '1') return;
      if (k.closest('[data-aed-stagger-children]') !== parent) return;
      var existingDelay = parseInt(k.getAttribute('data-aed-delay') || '0', 10);
      var d = existingDelay + per * i;
      k.style.transitionDelay = d + 'ms';
      k.dataset.aedStaggered = '1';
      i += 1;
    });
  }

  function show(el) {
    el.classList.add('is-visible');
  }
  function hide(el) {
    el.classList.remove('is-visible');
  }

  function attach(el) {
    if (el.dataset.aedAnimReady === '1') return;
    el.dataset.aedAnimReady = '1';
    applyInline(el);

    if (REDUCED) {
      show(el);
      return;
    }

    // Per-element data-aed-replay wins; fall back to site-wide default.
    var replay = el.hasAttribute('data-aed-replay') || REPLAY_DEFAULT;
    if (!('IntersectionObserver' in window)) {
      show(el);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(el);
          if (!replay) io.disconnect();
        } else if (replay) {
          hide(el);
        }
      });
    }, { threshold: THRESHOLD });
    io.observe(el);
  }

  // Promote elements matched by a meta-level auto-scope into animated targets
  // by stamping the requested effect attribute. Existing data-aed-* wins.
  var AUTO_EFFECTS = {
    'fade-in': 'data-aed-fade-in',
    'fade-up': 'data-aed-fade-up',
    'fade-down': 'data-aed-fade-down',
    'fade-left': 'data-aed-fade-left',
    'fade-right': 'data-aed-fade-right',
    'zoom-in': 'data-aed-zoom-in',
    'zoom-out': 'data-aed-zoom-out',
  };
  function autoPromote() {
    var scope = meta.getAttribute('data-auto-scope');
    if (scope) {
      var effect = (meta.getAttribute('data-auto-effect') || 'fade-up').toLowerCase();
      var attr = AUTO_EFFECTS[effect];
      if (attr) {
        document.querySelectorAll(scope).forEach(function (el) {
          // Skip if element already has any animation attr
          for (var i = 0; i < SELECTOR_ATTRS.length; i++) {
            if (el.hasAttribute(SELECTOR_ATTRS[i])) return;
          }
          el.setAttribute(attr, '');
        });
      }
    }
    var staggerScope = meta.getAttribute('data-auto-stagger');
    if (staggerScope) {
      var staggerMs = meta.getAttribute('data-auto-stagger-ms');
      document.querySelectorAll(staggerScope).forEach(function (parent) {
        if (parent.hasAttribute('data-aed-stagger-children')) return;
        parent.setAttribute('data-aed-stagger-children', '');
        if (staggerMs && !parent.hasAttribute('data-aed-stagger')) {
          parent.setAttribute('data-aed-stagger', staggerMs);
        }
      });
    }
  }

  var SELECTOR_ATTRS = [
    'data-aed-fade-in','data-aed-fade-up','data-aed-fade-down',
    'data-aed-fade-left','data-aed-fade-right','data-aed-zoom-in','data-aed-zoom-out',
  ];

  function scan() {
    autoPromote();
    document.querySelectorAll('[data-aed-stagger-children]').forEach(applyStagger);
    document.querySelectorAll(SELECTOR).forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__animations = {
    version: VERSION,
    refresh: scan,
    show: show,
    hide: hide,
  };
})();
