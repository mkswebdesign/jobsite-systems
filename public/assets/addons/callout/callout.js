/*
 * Callout — drop-in themed boxes.
 *
 * For every [data-aed-callout] element on the page:
 *   - Wraps existing children in a `.aed-cl-body` div
 *   - Prepends the kind's icon
 *   - Optionally prepends a title from data-aed-callout-title
 *
 *   <aside data-aed-callout="warn" data-aed-callout-title="Heads up">
 *     The merge freeze starts <strong>Friday</strong>.
 *   </aside>
 *
 *   <aside data-aed-callout="quote">
 *     "We turn ideas into shipped sites."
 *   </aside>
 *
 * Kinds: info (default), tip, success, warn, danger, quote.
 *
 * Public API:
 *   window.__callout.refresh()   — re-scan after dynamic insert
 *
 * See /callout/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var KINDS = { info:1, tip:1, success:1, warn:1, danger:1, quote:1 };

  var ICONS = {
    info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    tip:     '<path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.5 4.5 4 5.5V18h6v-3.5c2.5-1 4-3.1 4-5.5a7 7 0 0 0-7-7z"/><line x1="9" y1="22" x2="15" y2="22"/>',
    success: '<polyline points="20 6 9 17 4 12"/>',
    warn:    '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    danger:  '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    quote:   '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h1c1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>',
  };

  function svg(kind) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[kind] || ICONS.info) + '</svg>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function attach(el) {
    if (el.dataset.aedClReady === '1') return;
    el.dataset.aedClReady = '1';
    var kind = (el.getAttribute('data-aed-callout') || 'info').toLowerCase();
    if (!KINDS[kind]) {
      kind = 'info';
      el.setAttribute('data-aed-callout', kind);
    }

    el.setAttribute('role', kind === 'warn' || kind === 'danger' ? 'alert' : 'note');

    var title = el.getAttribute('data-aed-callout-title');

    // Wrap existing children into a body div
    var body = document.createElement('div');
    body.className = 'aed-cl-body';
    while (el.firstChild) body.appendChild(el.firstChild);

    if (title) {
      var t = document.createElement('strong');
      t.className = 'aed-cl-title';
      t.textContent = title;
      body.insertBefore(t, body.firstChild);
    }

    var icon = document.createElement('span');
    icon.className = 'aed-cl-icon';
    icon.innerHTML = svg(kind);

    el.appendChild(icon);
    el.appendChild(body);

    // Reorder so icon comes first
    el.insertBefore(icon, body);
  }

  function scan() {
    document.querySelectorAll('[data-aed-callout]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__callout = {
    version: VERSION,
    refresh: scan,
  };
})();
