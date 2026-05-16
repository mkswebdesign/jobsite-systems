/*
 * Glossary — drop-in hover-tooltip definitions.
 *
 * Configure with an inline JSON block (id from site.json json[]):
 *   {
 *     "API":  "Application Programming Interface — the contract a service exposes to other software.",
 *     "CMS":  "Content Management System — admin software for editing content (e.g. WordPress).",
 *     "WCAG": "Web Content Accessibility Guidelines — the accessibility spec we build to."
 *   }
 *
 * In your content, mark terms:
 *   <dfn data-aed-glossary>API</dfn>
 *   <dfn data-aed-glossary="CMS">our CMS</dfn>   <!-- term key overrides text -->
 *
 * On hover/focus (desktop) or tap (touch), a popup with the definition
 * appears near the term.
 *
 * Public API:
 *   window.__glossary.refresh()
 *   window.__glossary.lookup(term)      — case-insensitive
 *   window.__glossary.show(el)
 *   window.__glossary.hide()
 *
 * See /glossary/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var configEl = document.getElementById('aed-glossary');
  var dictionary = {};
  if (configEl) {
    try {
      var loaded = JSON.parse(configEl.textContent || '{}');
      Object.keys(loaded).forEach(function (k) {
        dictionary[k.toLowerCase()] = { key: k, def: loaded[k] };
      });
    } catch (_) {}
  }

  function lookup(term) {
    if (!term) return null;
    return dictionary[String(term).toLowerCase()] || null;
  }

  var popup = null;
  function ensurePopup() {
    if (popup) return popup;
    popup = document.createElement('div');
    popup.className = 'aed-gloss-popup';
    popup.setAttribute('role', 'tooltip');
    document.body.appendChild(popup);
    return popup;
  }

  function show(el) {
    var term = el.getAttribute('data-aed-glossary') || el.textContent || '';
    var entry = lookup(term);
    if (!entry) return;
    var p = ensurePopup();
    p.innerHTML = '<span class="aed-gloss-term">' + escapeHtml(entry.key) + '</span>' + escapeHtml(entry.def);
    var rect = el.getBoundingClientRect();
    p.style.top = (window.scrollY + rect.bottom + 8) + 'px';
    p.style.left = (window.scrollX + rect.left) + 'px';

    // Re-position if overflowing right edge
    requestAnimationFrame(function () {
      var pRect = p.getBoundingClientRect();
      if (pRect.right > window.innerWidth - 8) {
        var shift = pRect.right - (window.innerWidth - 8);
        p.style.left = (parseFloat(p.style.left) - shift) + 'px';
      }
      // If would extend past bottom, flip above the term
      if (pRect.bottom > window.innerHeight) {
        p.style.top = (window.scrollY + rect.top - pRect.height - 8) + 'px';
      }
      p.classList.add('is-open');
    });
  }

  function hide() {
    if (popup) popup.classList.remove('is-open');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function attach(el) {
    if (el.dataset.aedGlReady === '1') return;
    el.dataset.aedGlReady = '1';

    var term = el.getAttribute('data-aed-glossary') || el.textContent || '';
    var entry = lookup(term);
    if (!entry) return;
    el.tabIndex = 0;
    el.setAttribute('aria-label', entry.key + ': ' + entry.def);

    el.addEventListener('mouseenter', function () { show(el); });
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus',      function () { show(el); });
    el.addEventListener('blur',       hide);
    // Touch: tap to toggle
    el.addEventListener('click',      function (e) {
      if (popup && popup.classList.contains('is-open')) { hide(); }
      else { show(el); }
      e.preventDefault();
    });
  }

  function scan() {
    document.querySelectorAll('[data-aed-glossary]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }
  // Hide popup on outside click / scroll
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-aed-glossary]') || e.target.closest('.aed-gloss-popup')) return;
    hide();
  }, true);
  window.addEventListener('scroll', hide, { passive: true });

  window.__glossary = {
    version: VERSION,
    refresh: scan,
    lookup: lookup,
    show: show,
    hide: hide,
  };
})();
