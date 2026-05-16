/*
 * Floating CTA — drop-in floating call-to-action pill.
 *
 * Reveals after the visitor scrolls past a fraction of the first viewport
 * and links to a configured destination (defaults to /start/). Per-session
 * dismissable via the small × button. All copy + behavior overridable via
 * the JSON config block emitted by the addon runtime.
 *
 * See ./README.md.
 */
(function () {
  'use strict';

  var SS_DISMISSED = 'aed:floating-cta:dismissed';

  var defaults = {
    href: '/start/',
    label: 'Get Started',
    hint: 'Tell us about your project',
    showOnPaths: [],
    hideOnPaths: ['/start/'],
    revealAfterRatio: 0.6,
    revealAfterMin: 360,
    dismissable: true,
    /* Auto-hide when an "anchor" CTA (button or .btn-primary / .design-break__cta /
     * .hero-actions / .final-cta-actions / .nav-cta) is within `nearCtaThreshold`
     * pixels of the floating CTA's center, to avoid double-CTA stacking. Disable
     * by setting nearCtaSelector to a falsy value in the brand's site.json
     * `addons["floating-cta"].json[0].data`. */
    nearCtaSelector: '.btn-primary, .design-break__cta, .nav-cta, .hero-actions a, .final-cta-actions a, [data-floating-cta-anchor]',
    nearCtaThreshold: 200,
  };

  var config = Object.assign({}, defaults);
  (function loadConfig() {
    var el = document.getElementById('aed-floating-cta-config');
    if (!el) return;
    try {
      var cfg = JSON.parse(el.textContent || '{}');
      Object.keys(cfg).forEach(function (k) { config[k] = cfg[k]; });
    } catch (_) {}
  })();

  function pathMatches(list, path) {
    if (!Array.isArray(list)) return false;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (path === p) return true;
      if (path === p + '/' || (typeof p === 'string' && p.endsWith('/') && path === p.slice(0, -1))) return true;
    }
    return false;
  }

  var path = window.location.pathname;
  if (Array.isArray(config.showOnPaths) && config.showOnPaths.length && !pathMatches(config.showOnPaths, path)) return;
  if (pathMatches(config.hideOnPaths, path)) return;

  try { if (sessionStorage.getItem(SS_DISMISSED) === '1') return; } catch (_) {}

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  var cta = null;
  var dismissBtn = null;
  var revealed = false;
  var raf = 0;
  var revealAfter = Math.max(window.innerHeight * config.revealAfterRatio, config.revealAfterMin);

  function build() {
    cta = document.createElement('a');
    cta.id = 'float-cta';
    cta.className = 'float-cta';
    cta.href = config.href;
    cta.setAttribute('data-revealed', 'false');
    cta.setAttribute('aria-label', config.label + (config.hint ? ' — ' + config.hint : ''));
    cta.innerHTML =
      '<span class="float-cta-icon" aria-hidden="true">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M5 12h14M13 6l6 6-6 6"/>' +
        '</svg>' +
      '</span>' +
      '<span class="float-cta-text">' +
        '<span class="float-cta-label">' + escapeHtml(config.label) + '</span>' +
        (config.hint ? '<span class="float-cta-hint">' + escapeHtml(config.hint) + '</span>' : '') +
      '</span>';
    document.body.appendChild(cta);

    if (config.dismissable) {
      dismissBtn = document.createElement('button');
      dismissBtn.id = 'float-cta-dismiss';
      dismissBtn.className = 'float-cta-dismiss';
      dismissBtn.type = 'button';
      dismissBtn.setAttribute('aria-label', 'Dismiss');
      dismissBtn.setAttribute('data-revealed', 'false');
      dismissBtn.innerHTML = '&times;';
      dismissBtn.addEventListener('click', dismiss);
      document.body.appendChild(dismissBtn);
    }
  }

  /* Returns true when any nearCta anchor's bounding box is within
   * `nearCtaThreshold` px of the floating CTA's center. Cheap enough to
   * run on rAF — querySelectorAll over a small set, then a few rect math
   * checks. Bails early when the floating CTA isn't yet revealed. */
  function nearOtherCta() {
    if (!cta || !config.nearCtaSelector) return false;
    var ctaRect = cta.getBoundingClientRect();
    if (ctaRect.width === 0 && ctaRect.height === 0) return false;
    var ctaCx = ctaRect.left + ctaRect.width / 2;
    var ctaCy = ctaRect.top + ctaRect.height / 2;
    var threshold = config.nearCtaThreshold || 200;
    var anchors;
    try { anchors = document.querySelectorAll(config.nearCtaSelector); }
    catch (_) { return false; }
    for (var i = 0; i < anchors.length; i++) {
      var el = anchors[i];
      if (el === cta) continue;
      /* Ignore anchors that aren't currently visible in the viewport. */
      var r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      var elCx = r.left + r.width / 2;
      var elCy = r.top + r.height / 2;
      var dx = elCx - ctaCx;
      var dy = elCy - ctaCy;
      if (Math.sqrt(dx * dx + dy * dy) < threshold) return true;
    }
    return false;
  }

  function update() {
    raf = 0;
    var should = window.scrollY > revealAfter;
    if (should !== revealed) {
      revealed = should;
      cta.setAttribute('data-revealed', should ? 'true' : 'false');
      if (dismissBtn) dismissBtn.setAttribute('data-revealed', should ? 'true' : 'false');
    }
    /* Once revealed, hide briefly when colliding with another CTA. */
    if (revealed && cta) {
      var near = nearOtherCta();
      cta.setAttribute('data-near-cta', near ? 'true' : 'false');
      if (dismissBtn) dismissBtn.setAttribute('data-near-cta', near ? 'true' : 'false');
    }
  }
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(update);
  }
  function onResize() {
    revealAfter = Math.max(window.innerHeight * config.revealAfterRatio, config.revealAfterMin);
  }

  function dismiss() {
    if (cta) cta.setAttribute('data-revealed', 'false');
    if (dismissBtn) dismissBtn.setAttribute('data-revealed', 'false');
    try { sessionStorage.setItem(SS_DISMISSED, '1'); } catch (_) {}
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    setTimeout(function () {
      if (cta) cta.remove();
      if (dismissBtn) dismissBtn.remove();
      cta = null;
      dismissBtn = null;
    }, 350);
  }

  function start() {
    build();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.__floatingCta = {
    config: config,
    dismiss: dismiss,
    reset: function () {
      try { sessionStorage.removeItem(SS_DISMISSED); } catch (_) {}
    },
  };
})();
