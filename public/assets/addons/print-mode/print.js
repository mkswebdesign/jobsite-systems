/*
 * Print mode — runtime helpers
 *
 *  1. ?print=preview       Swap the print stylesheet to media="all" so the
 *                          page renders as it would print, without invoking
 *                          the print dialog. Persists via sessionStorage.
 *
 *  2. ?print=normal        Revert to print-only behavior.
 *
 *  3. [data-print-button]  Any element with this attribute is replaced by a
 *                          styled "Print page" button. Drop the placeholder
 *                          anywhere on a page and the button appears.
 *
 *  4. Date stamp           If the layout includes a `.print-stamp-date`
 *                          element with no content, today's date is filled
 *                          in client-side (so cached HTML stays accurate).
 *
 * See /print-mode/README.md for integration notes.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var SS_KEY = 'aed:print-preview';
  var LINK_SELECTOR = 'link[href*="/print-mode/print.css"]';

  // -- Preview mode toggle -------------------------------------------------
  function setPreview(on) {
    var link = document.querySelector(LINK_SELECTOR);
    if (link) link.setAttribute('media', on ? 'all' : 'print');
    document.body.classList.toggle('print-preview', !!on);
    try {
      if (on) sessionStorage.setItem(SS_KEY, '1');
      else sessionStorage.removeItem(SS_KEY);
    } catch (_) {}
  }

  function applyQueryFlag() {
    var p = new URLSearchParams(window.location.search);
    var v = p.get('print');
    if (v === 'preview') { setPreview(true); return true; }
    if (v === 'normal' || v === 'off') { setPreview(false); return true; }
    return false;
  }

  function restoreFromSession() {
    try {
      if (sessionStorage.getItem(SS_KEY) === '1') setPreview(true);
    } catch (_) {}
  }

  // -- [data-print-button] placeholders -----------------------------------
  function injectButtons() {
    var slots = document.querySelectorAll('[data-print-button]');
    if (!slots.length) return;
    slots.forEach(function (slot) {
      // Don't double-inject if the script runs twice
      if (slot.dataset.printButtonReady === '1') return;
      var label = slot.getAttribute('data-print-button-label') || 'Print page';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'print-button';
      btn.setAttribute('aria-label', label);
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<polyline points="6 9 6 2 18 2 18 9"></polyline>' +
        '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>' +
        '<rect x="6" y="14" width="12" height="8"></rect>' +
        '</svg><span>' + label + '</span>';
      btn.addEventListener('click', function () { window.print(); });
      slot.appendChild(btn);
      slot.dataset.printButtonReady = '1';
    });
  }

  // -- Date stamp --------------------------------------------------------
  function fillDate() {
    var el = document.querySelector('.print-stamp-date:empty');
    if (!el) return;
    var d = new Date();
    var opts = { year: 'numeric', month: 'short', day: 'numeric' };
    el.textContent = d.toLocaleDateString(undefined, opts);
  }

  // -- Boot --------------------------------------------------------------
  function boot() {
    if (!applyQueryFlag()) restoreFromSession();
    injectButtons();
    fillDate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose for manual control from console
  window.__printMode = { version: VERSION, setPreview: setPreview };
})();
