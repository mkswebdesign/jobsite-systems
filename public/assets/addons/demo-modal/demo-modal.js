/*
 * Demo Modal — click-intercept modal for /demo/<slug>/* pages.
 *
 * On demo pages, intercepts clicks on links that point to other pages within
 * the SAME demo, opens a modal explaining the site is illustrative, and
 * surfaces real pricing / contact CTAs. After dismiss, the original
 * navigation proceeds.
 *
 * Reads config from inline JSON `<script type="application/json"
 * id="aed-demo-modal-config">…</script>`. No-ops on non-demo pages.
 *
 * Public API (window.__demoModal):
 *   show(href)  — force-open with an optional pending href
 *   hide()      — close without navigating
 *   reset()     — clear the per-session shown flag
 *   config      — resolved config object
 */
(function () {
  'use strict';

  // ---- Path gate ------------------------------------------------------
  // Activate only on /demo/<slug>/* paths. The slug is the FIRST path
  // segment after /demo/. On any other path, the addon is inert.
  var path = window.location.pathname;
  var demoMatch = /^\/demo\/([^\/]+)(\/|$)/.exec(path);
  if (!demoMatch) return;
  var demoSlug = demoMatch[1];
  var demoPrefix = '/demo/' + demoSlug + '/';

  // ---- Load config ----------------------------------------------------
  var configEl = document.getElementById('aed-demo-modal-config');
  if (!configEl) return;
  var config;
  try { config = JSON.parse(configEl.textContent || '{}'); }
  catch (_) { return; }
  if (!config || !config.heading || !config.body) return;
  if (!config.pricingCta || !config.pricingCta.label || !config.pricingCta.href) return;

  // Defaults
  config.eyebrow = config.eyebrow || 'Heads up — this is a demo';
  config.continueLabel = config.continueLabel || 'Continue to the demo page';
  // Default false — every in-demo click opens the modal so the disclosure
  // is consistent. Set to true only when a brand explicitly wants the
  // "show once per session" behavior.
  config.interceptOncePerSession = config.interceptOncePerSession === true;

  // ---- Per-session shown flag ----------------------------------------
  // Scoped per demo slug so visiting two different demos in the same
  // session shows the modal once on each. Uses sessionStorage so the
  // flag clears on tab close — different from demo-promo's permanent
  // localStorage dismissal because the disclosure here is per-visit
  // not per-message.
  var SS_KEY = 'aed:demo-modal:shown:' + demoSlug;
  function hasShown() {
    if (!config.interceptOncePerSession) return false;
    try { return sessionStorage.getItem(SS_KEY) === '1'; }
    catch (_) { return false; }
  }
  function markShown() {
    if (!config.interceptOncePerSession) return;
    try { sessionStorage.setItem(SS_KEY, '1'); } catch (_) {}
  }

  // ---- Modal DOM ------------------------------------------------------
  // Built imperatively so we don't have to ship an HTML template — the
  // single addon.js stays self-contained.
  var pendingHref = null;
  var modalRoot = null;
  var lastFocused = null;

  function buildCtaHTML(cta, kind) {
    if (!cta || !cta.label || !cta.href) return '';
    return (
      '<a class="aed-demo-modal__cta aed-demo-modal__cta--' + kind + '" href="' +
      escapeAttr(cta.href) + '" data-cta="' + kind + '">' + escapeHtml(cta.label) + '</a>'
    );
  }

  function buildModal() {
    var root = document.createElement('div');
    root.className = 'aed-demo-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'aed-demo-modal-heading');
    root.setAttribute('aria-describedby', 'aed-demo-modal-body');
    root.innerHTML =
      '<div class="aed-demo-modal__backdrop" data-action="dismiss" aria-hidden="true"></div>' +
      '<div class="aed-demo-modal__card" role="document">' +
      '  <button class="aed-demo-modal__close" type="button" aria-label="Close" data-action="dismiss">' +
      '    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">' +
      '      <path d="M2 2 L 12 12 M 12 2 L 2 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
      '    </svg>' +
      '  </button>' +
      '  <div class="aed-demo-modal__eyebrow">' + escapeHtml(config.eyebrow) + '</div>' +
      '  <h2 class="aed-demo-modal__heading" id="aed-demo-modal-heading">' + escapeHtml(config.heading) + '</h2>' +
      '  <p class="aed-demo-modal__body" id="aed-demo-modal-body">' + escapeHtml(config.body) + '</p>' +
      '  <div class="aed-demo-modal__ctas">' +
      '    ' + buildCtaHTML(config.pricingCta, 'primary') +
      '    ' + buildCtaHTML(config.contactCta, 'secondary') +
      '  </div>' +
      '  <button class="aed-demo-modal__continue" type="button" data-action="continue">' +
      escapeHtml(config.continueLabel) +
      '    <span class="aed-demo-modal__continue-arrow" aria-hidden="true">→</span>' +
      '  </button>' +
      '</div>';
    return root;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function ensureModal() {
    if (modalRoot && modalRoot.isConnected) return modalRoot;
    modalRoot = buildModal();
    document.body.appendChild(modalRoot);
    modalRoot.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== modalRoot) {
        var act = t.getAttribute && t.getAttribute('data-action');
        if (act === 'dismiss') { e.preventDefault(); hide(); return; }
        if (act === 'continue') {
          e.preventDefault();
          var href = pendingHref;
          hide();
          if (href) window.location.assign(href);
          return;
        }
        // CTAs (primary/secondary) — let the browser navigate normally; just
        // close the modal first so it's not lingering during paint.
        if (t.tagName === 'A' && t.hasAttribute('data-cta')) { hide(); return; }
        t = t.parentNode;
      }
    });
    return modalRoot;
  }

  function show(href) {
    pendingHref = typeof href === 'string' ? href : null;
    ensureModal();
    lastFocused = document.activeElement;
    requestAnimationFrame(function () {
      modalRoot.classList.add('aed-demo-modal--open');
      document.documentElement.classList.add('aed-demo-modal-locked');
      // Focus the close button for keyboard users
      var closeBtn = modalRoot.querySelector('.aed-demo-modal__close');
      if (closeBtn) closeBtn.focus();
    });
    markShown();
  }

  function hide() {
    if (!modalRoot) return;
    modalRoot.classList.remove('aed-demo-modal--open');
    document.documentElement.classList.remove('aed-demo-modal-locked');
    pendingHref = null;
    if (lastFocused && typeof lastFocused.focus === 'function') {
      try { lastFocused.focus(); } catch (_) {}
    }
  }

  function reset() {
    try { sessionStorage.removeItem(SS_KEY); } catch (_) {}
  }

  // ---- Click interception --------------------------------------------
  // Resolves any link's href to a same-origin pathname and decides
  // whether it points within the current demo. Skips external, hash-only,
  // mailto:, tel:, javascript:, and the current page itself.
  function isInDemoLink(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== '' && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    var raw = a.getAttribute('href') || '';
    if (!raw) return false;
    if (raw.charAt(0) === '#') return false;
    if (/^(mailto:|tel:|javascript:)/i.test(raw)) return false;
    var u;
    try { u = new URL(a.href, window.location.href); } catch (_) { return false; }
    if (u.origin !== window.location.origin) return false;
    if (!u.pathname.indexOf) return false;
    if (u.pathname.indexOf(demoPrefix) !== 0) return false;
    // Skip clicks that target the page we're already on (in-page anchors)
    if (u.pathname === window.location.pathname && !u.hash) return false;
    return true;
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return; // left-click only
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // open-in-new-tab etc.
    var t = e.target;
    while (t && t.nodeType === 1 && t.tagName !== 'A') t = t.parentNode;
    if (!t || t.tagName !== 'A') return;
    if (!isInDemoLink(t)) return;
    if (hasShown()) return; // honor per-session flag
    // Belt-and-suspenders: preventDefault stops the browser's link follow,
    // stopImmediatePropagation stops every other click listener (including
    // any addon or inline handler that might do programmatic navigation
    // in the bubble phase). Without the latter, sibling addons' click
    // handlers would still fire and could window.location.assign the same
    // href our modal is supposed to gate on.
    e.preventDefault();
    e.stopImmediatePropagation();
    show(t.href);
  }, true);

  // Esc key dismisses the modal
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!modalRoot || !modalRoot.classList.contains('aed-demo-modal--open')) return;
    hide();
  });

  // ---- Public API ----------------------------------------------------
  window.__demoModal = {
    show: show,
    hide: hide,
    reset: reset,
    config: config
  };
})();
