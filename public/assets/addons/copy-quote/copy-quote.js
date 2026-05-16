/*
 * Copy Quote — drop-in selection → "Copy as quote" button.
 *
 * When the user selects text within a configured scope, a floating
 * button appears above the selection. Click → copies the selection
 * with attribution + URL to the clipboard.
 *
 * Config:
 *   <meta name="aed:copy-quote" content="auto"
 *         data-scope="article, .case-study"
 *         data-min="20"
 *         data-template='"{text}"\n— {brand} ({url})'
 *         data-touch="off">
 *
 * `data-touch="on"` enables on touch devices (default off — mobile has
 * its own selection toolbar).
 *
 * Brand inference (when `{brand}` template token is used):
 *   <meta property="og:site_name">   →   used if present
 *   document.title (everything before " | ")  →  fallback
 *
 * Public API:
 *   window.__copyQuote.refresh()   — re-bind after dynamic content
 *   window.__copyQuote.format(t)   — return formatted string for a string
 *
 * See /copy-quote/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var meta = document.querySelector('meta[name="aed:copy-quote"]');
  if (!meta) return;
  var v = (meta.getAttribute('content') || '').toLowerCase();
  if (v !== 'auto' && v !== 'on' && v !== 'true' && v !== '1') return;

  var scope = meta.getAttribute('data-scope') || 'article, main';
  var minLen = parseInt(meta.getAttribute('data-min') || '20', 10);
  var template = meta.getAttribute('data-template') || '"{text}"\n— {brand} ({url})';
  var touchOn = (meta.getAttribute('data-touch') || 'off').toLowerCase() === 'on';

  var IS_TOUCH = window.matchMedia && window.matchMedia('(hover: none)').matches;
  if (IS_TOUCH && !touchOn) return;

  function brandName() {
    var og = document.querySelector('meta[property="og:site_name"]');
    if (og && og.getAttribute('content')) return og.getAttribute('content');
    var t = document.title || '';
    return t.split(/\s[—|]\s/)[0].trim() || 'this site';
  }

  function format(text) {
    var url = window.location.href.split('#')[0];
    return template
      .replace(/\\n/g, '\n')
      .replace(/\{text\}/g, text)
      .replace(/\{brand\}/g, brandName())
      .replace(/\{url\}/g, url)
      .replace(/\{title\}/g, document.title || '');
  }

  function copy(text, btn) {
    var done = function () {
      btn.classList.add('is-copied');
      btn.querySelector('.aed-cq-label').textContent = 'Copied';
      setTimeout(function () {
        btn.classList.remove('is-copied');
        btn.querySelector('.aed-cq-label').textContent = 'Copy as quote';
      }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.left = '-10000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (_) {}
      ta.remove();
    }
  }

  // -- Build button (single instance, reused) --------------------------
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'aed-cq-btn';
  btn.setAttribute('aria-label', 'Copy selection as a quote');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M9 9h-2v2"/><path d="M15 9h-2v2"/>' +
    '<path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>' +
    '<rect x="3" y="3" width="18" height="18" rx="3" stroke-width="0" fill="none"/>' +
    '</svg>' +
    '<span class="aed-cq-label">Copy as quote</span>';
  btn.addEventListener('mousedown', function (e) { e.preventDefault(); }); // don't blur selection
  btn.addEventListener('click', function () {
    var sel = window.getSelection();
    if (!sel) return;
    var text = sel.toString().trim();
    if (!text) return;
    copy(format(text), btn);
  });

  function mount() {
    document.body.appendChild(btn);
  }

  // -- Selection handling --------------------------------------------
  function isInScope(node) {
    if (!node) return false;
    if (node.nodeType !== 1) node = node.parentElement;
    if (!node) return false;
    return !!node.closest(scope);
  }

  function hide() {
    btn.classList.remove('is-visible');
  }
  function showAt(rect) {
    var top = window.scrollY + rect.top - 44;  // above selection
    var left = window.scrollX + rect.left + (rect.width / 2) - (btn.offsetWidth / 2);

    // Keep within viewport horizontally
    var min = 8;
    var max = window.innerWidth - btn.offsetWidth - 8;
    if (left < min) left = min;
    if (left > max) left = max;

    // If selection is near top of viewport, show below instead
    if (rect.top < 60) {
      top = window.scrollY + rect.bottom + 12;
    }

    btn.style.top = (top - window.scrollY) + 'px';
    btn.style.left = (left - window.scrollX) + 'px';
    btn.classList.add('is-visible');
  }

  function update() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { hide(); return; }
    var text = sel.toString();
    if (text.length < minLen) { hide(); return; }
    var range = sel.getRangeAt(0);
    if (!isInScope(range.startContainer) && !isInScope(range.endContainer)) { hide(); return; }
    var rect = range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) { hide(); return; }
    showAt(rect);
  }

  document.addEventListener('selectionchange', update);
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide);
  document.addEventListener('mousedown', function (e) {
    if (e.target.closest('.aed-cq-btn')) return;
    // Re-evaluate after browser updates selection
    setTimeout(update, 50);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  window.__copyQuote = {
    version: VERSION,
    refresh: update,
    format: format,
    hide: hide,
  };
})();
