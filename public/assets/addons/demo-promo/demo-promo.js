/*
 * Demo Promo — small, dismissible bottom toast that appears after a
 * scroll threshold and points visitors to a sample demo page.
 *
 * Reads config from inline JSON `<script type="application/json"
 * id="aed-demo-promo">…</script>`. Per-id dismiss persists in
 * localStorage so users don't see the same toast twice. Skips on
 * `hideOnPaths` (default ['/demo/*', '/contact/', '/start/']) so
 * visitors who are already on the demo or already converting don't
 * get pestered.
 *
 * Trigger: scrollY ≥ scrollThreshold * (scrollHeight - innerHeight)
 *   AND elapsed ≥ minDelayMs.
 *
 * The minDelayMs floor matters on short pages where 30% of the
 * scroll range is already in the fold — without it the toast
 * would flash on every page load before the visitor reads anything.
 *
 * Public API (window.__demoPromo):
 *   show()    — force show
 *   hide()    — hide without dismissing
 *   reset()   — clear the dismiss flag
 *   config    — resolved config object
 */
(function () {
  'use strict';

  var LS_PREFIX = 'aed:demo-promo:dismissed:';

  // -- Load config -----------------------------------------------------
  var configEl = document.getElementById('aed-demo-promo');
  if (!configEl) return;

  var config;
  try { config = JSON.parse(configEl.textContent || '{}'); }
  catch (_) { return; }
  if (!config || !config.id || !config.heading || !config.body) return;
  if (!config.cta || !config.cta.label || !config.cta.href) return;

  // Defaults
  config.eyebrow = config.eyebrow || 'See it live';
  config.position = ['bottom-right', 'bottom-left', 'bottom-center'].indexOf(config.position) >= 0
    ? config.position : 'bottom-right';
  config.scrollThreshold = (typeof config.scrollThreshold === 'number' && config.scrollThreshold > 0 && config.scrollThreshold <= 1)
    ? config.scrollThreshold : 0.3;
  config.minDelayMs = (typeof config.minDelayMs === 'number' && config.minDelayMs >= 0)
    ? config.minDelayMs : 1500;
  config.hideOnPaths = config.hideOnPaths || ['/demo/*', '/contact/', '/start/'];
  config.showOnlyOnPaths = config.showOnlyOnPaths || null;
  config.dismissCooldownDays = (typeof config.dismissCooldownDays === 'number' && config.dismissCooldownDays > 0)
    ? config.dismissCooldownDays : 0;

  // -- Path filtering --------------------------------------------------
  // Same matcher pattern as announcement-bar: trailing '*' = prefix match.
  var path = window.location.pathname;
  function pathMatches(p) {
    if (typeof p !== 'string' || !p) return false;
    if (p.charAt(p.length - 1) === '*') {
      var bare = p.slice(0, -1).replace(/\/$/, '');
      return path === bare || path === bare + '/' || path.indexOf(bare + '/') === 0;
    }
    return path === p || path === p + '/' || (p.charAt(p.length - 1) === '/' && path === p.slice(0, -1));
  }
  for (var i = 0; i < config.hideOnPaths.length; i++) {
    if (pathMatches(config.hideOnPaths[i])) return;
  }
  if (config.showOnlyOnPaths) {
    var allowed = false;
    for (var j = 0; j < config.showOnlyOnPaths.length; j++) {
      if (pathMatches(config.showOnlyOnPaths[j])) { allowed = true; break; }
    }
    if (!allowed) return;
  }

  // -- Dismiss flag ----------------------------------------------------
  var lsKey = LS_PREFIX + config.id;
  function isDismissed() {
    try {
      var v = localStorage.getItem(lsKey);
      if (!v) return false;
      if (v === '1') return true; // permanent
      var until = parseInt(v, 10);
      if (isNaN(until)) return false;
      return Date.now() < until;
    } catch (_) { return false; }
  }
  function markDismissed() {
    try {
      if (config.dismissCooldownDays > 0) {
        var until = Date.now() + config.dismissCooldownDays * 86400000;
        localStorage.setItem(lsKey, String(until));
      } else {
        localStorage.setItem(lsKey, '1');
      }
    } catch (_) { /* private mode etc. — accept that the toast may reappear */ }
  }
  if (isDismissed()) return;

  // -- Render ----------------------------------------------------------
  var el = document.createElement('aside');
  el.className = 'aed-demo-promo';
  el.setAttribute('data-position', config.position);
  el.setAttribute('role', 'region');
  el.setAttribute('aria-label', config.eyebrow);
  el.hidden = true;
  el.innerHTML =
    '<button type="button" class="aed-demo-promo__close" aria-label="Dismiss">×</button>' +
    '<p class="aed-demo-promo__eyebrow">' +
      '<span class="aed-demo-promo__eyebrow-dot" aria-hidden="true"></span>' +
      escapeHtml(config.eyebrow) +
    '</p>' +
    '<h3 class="aed-demo-promo__heading">' + escapeHtml(config.heading) + '</h3>' +
    '<p class="aed-demo-promo__body">' + escapeHtml(config.body) + '</p>' +
    '<div class="aed-demo-promo__actions">' +
      '<a class="aed-demo-promo__cta" href="' + escapeAttr(config.cta.href) + '">' +
        '<span>' + escapeHtml(config.cta.label) + '</span>' +
        '<span class="aed-demo-promo__cta-arrow" aria-hidden="true">→</span>' +
      '</a>' +
      '<button type="button" class="aed-demo-promo__secondary">No thanks</button>' +
    '</div>';

  document.body.appendChild(el);

  // -- Show / hide ------------------------------------------------------
  var shown = false;
  function show() {
    if (shown) return;
    shown = true;
    el.hidden = false;
    // rAF so the browser paints the hidden=false transition starting state
    // before flipping data-show — without this, the entry animation skips.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.setAttribute('data-show', 'true');
      });
    });
  }
  function hide(opts) {
    if (!shown) return;
    el.removeAttribute('data-show');
    shown = false;
    if (opts && opts.dismiss) markDismissed();
    // Wait for the transition to finish before yanking from the DOM, so
    // the fade-out plays. 360ms covers the longest declared transition.
    setTimeout(function () { el.hidden = true; }, 360);
  }
  function reset() {
    try { localStorage.removeItem(lsKey); } catch (_) {}
  }

  // -- Triggers --------------------------------------------------------
  var loadedAt = Date.now();

  function checkScrollTrigger() {
    if (shown) return;
    if (Date.now() - loadedAt < config.minDelayMs) return;
    var scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var ratio = window.scrollY / scrollMax;
    if (ratio >= config.scrollThreshold) {
      show();
      // Scroll listener has done its job — drop it so we don't keep
      // checking after the toast is up.
      window.removeEventListener('scroll', onScroll);
    }
  }
  function onScroll() {
    // Throttle via rAF — scroll fires many times per frame on trackpad input.
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      checkScrollTrigger();
    });
  }
  var rafPending = false;
  window.addEventListener('scroll', onScroll, { passive: true });

  // Edge case — page might already be scrolled past the threshold
  // (e.g. visitor returns via back-forward cache mid-page). After the
  // minDelayMs floor passes, do a one-shot check.
  setTimeout(checkScrollTrigger, config.minDelayMs + 50);

  // -- Wire up dismiss buttons -----------------------------------------
  el.querySelector('.aed-demo-promo__close').addEventListener('click', function () {
    hide({ dismiss: true });
  });
  el.querySelector('.aed-demo-promo__secondary').addEventListener('click', function () {
    hide({ dismiss: true });
  });
  // CTA click also dismisses — visitor is taking the action; no need
  // to re-prompt them on subsequent visits.
  el.querySelector('.aed-demo-promo__cta').addEventListener('click', function () {
    markDismissed();
  });

  // -- Helpers ---------------------------------------------------------
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  // -- Public API ------------------------------------------------------
  window.__demoPromo = {
    show: show,
    hide: hide,
    reset: reset,
    config: config
  };
})();
