/*
 * Footnotes — drop-in markdown-style footnote linker.
 *
 *   Inline marker:
 *     The merge freeze<sup data-aed-fn="1">1</sup> begins Friday.
 *
 *   Footnote list (somewhere on the page):
 *     <ol data-aed-footnotes>
 *       <li id="fn-1">Per the engineering calendar, March 5.</li>
 *       <li id="fn-2">…</li>
 *     </ol>
 *
 * Behavior added by the addon:
 *   - Wraps <sup data-aed-fn="N"> in an <a href="#fn-N">.
 *   - Adds a back-link "↩" inside each <li id="fn-N"> pointing to the
 *     marker (so readers can return).
 *   - On hover/focus, shows the footnote text in a popup near the
 *     marker (touch devices skip the popup; tap = jump).
 *
 * Public API:
 *   window.__footnotes.refresh()   re-scan after dynamic insert
 *
 * See /footnotes/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var IS_TOUCH = window.matchMedia && window.matchMedia('(hover: none)').matches;

  var popup = null;
  function ensurePopup() {
    if (popup) return popup;
    popup = document.createElement('div');
    popup.className = 'aed-fn-popup';
    popup.setAttribute('role', 'tooltip');
    document.body.appendChild(popup);
    return popup;
  }

  function showPopup(anchor, html) {
    if (IS_TOUCH) return;
    var p = ensurePopup();
    p.innerHTML = html;
    var rect = anchor.getBoundingClientRect();
    var top = window.scrollY + rect.top - p.offsetHeight - 8;
    if (top < window.scrollY + 8) top = window.scrollY + rect.bottom + 8;
    var left = window.scrollX + rect.left;
    var max = window.scrollX + window.innerWidth - p.offsetWidth - 8;
    if (left > max) left = max;
    if (left < window.scrollX + 8) left = window.scrollX + 8;
    p.style.top = top + 'px';
    p.style.left = left + 'px';
    requestAnimationFrame(function () { p.classList.add('is-open'); });
  }
  function hidePopup() {
    if (popup) popup.classList.remove('is-open');
  }

  function attachMarker(sup) {
    if (sup.dataset.aedFnReady === '1') return;
    sup.dataset.aedFnReady = '1';
    var n = sup.getAttribute('data-aed-fn');
    if (!n) return;
    var target = document.getElementById('fn-' + n);
    if (!target) return;

    // Stamp marker with id so back-links work
    if (!sup.id) sup.id = 'fnref-' + n;

    // Wrap in anchor
    var existingText = sup.textContent || n;
    sup.textContent = '';
    var a = document.createElement('a');
    a.href = '#fn-' + n;
    a.textContent = existingText;
    a.setAttribute('aria-describedby', 'fn-' + n);
    sup.appendChild(a);

    // Hover popup
    a.addEventListener('mouseenter', function () { showPopup(a, target.innerHTML); });
    a.addEventListener('mouseleave', hidePopup);
    a.addEventListener('focus', function () { showPopup(a, target.innerHTML); });
    a.addEventListener('blur', hidePopup);
  }

  function attachFootnote(li) {
    if (li.dataset.aedFnReady === '1') return;
    li.dataset.aedFnReady = '1';
    var id = li.id;
    var m = id && id.match(/^fn-(.+)$/);
    if (!m) return;
    var n = m[1];
    if (!document.querySelector('sup[data-aed-fn="' + n + '"]')) return;

    // Append a back-link
    var back = document.createElement('a');
    back.className = 'aed-fn-back';
    back.href = '#fnref-' + n;
    back.textContent = '↩';
    back.setAttribute('aria-label', 'Back to reference ' + n);
    li.appendChild(back);
  }

  function scan() {
    document.querySelectorAll('sup[data-aed-fn]').forEach(attachMarker);
    document.querySelectorAll('[data-aed-footnotes] > li[id^="fn-"]').forEach(attachFootnote);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__footnotes = {
    version: VERSION,
    refresh: scan,
  };
})();
