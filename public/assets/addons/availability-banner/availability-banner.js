/*
 * Availability Banner — drop-in capacity indicator.
 *
 * Hydrates every <div data-aed-availability> on the page from a single
 * source of truth: inline JSON or a fetched URL. Render variant is
 * per-element via `data-aed-variant="card"` (default) or `"pill"`.
 *
 *   <script type="application/json" id="aed-availability">
 *   { "status": "limited",
 *     "text": "**3 spots remaining** for May launches",
 *     "footnote": "Updated April 19, 2026",
 *     "cta": { "label": "Book intro", "href": "/contact/" } }
 *   </script>
 *
 *   <!-- Anywhere in your page: -->
 *   <div data-aed-availability></div>
 *   <div data-aed-availability data-aed-variant="pill"></div>
 *
 * Or fetched (good for backend-driven updates without rebuild):
 *   <meta name="aed:availability" content="/data/availability.json">
 *
 * Public API:
 *   window.__availability.refresh()      — re-fetch / re-render all
 *   window.__availability.get()          — current state (read-only)
 *   window.__availability.set(state)     — override + re-render
 *
 * See /availability-banner/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var STATUSES = { open: 1, limited: 1, booked: 1 };

  // -- State source -----------------------------------------------------
  var state = null;

  function loadState() {
    var inline = document.getElementById('aed-availability');
    if (inline) {
      try { return Promise.resolve(JSON.parse(inline.textContent || '{}')); }
      catch (_) { return Promise.resolve(null); }
    }
    var meta = document.querySelector('meta[name="aed:availability"]');
    if (meta) {
      var url = meta.getAttribute('content');
      if (url) return fetch(url).then(function (r) { return r.json(); }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function renderText(s) {
    return escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  // -- Render one element ----------------------------------------------
  function render(el, st) {
    if (!st || !st.text) {
      // No data → silently hide so the addon doesn't litter empty boxes
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    el.hidden = false;
    var status = (st.status && STATUSES[st.status]) ? st.status : 'open';
    el.setAttribute('data-aed-status', status);
    if (!el.hasAttribute('data-aed-variant')) el.setAttribute('data-aed-variant', 'card');
    el.classList.add('aed-availability');
    el.setAttribute('role', 'status');

    var aria = st.text.replace(/\*\*/g, '');
    el.setAttribute('aria-label', 'Availability: ' + aria);

    var html =
      '<span class="aed-availability-dot" aria-hidden="true"></span>' +
      '<span class="aed-availability-body">' +
        '<span class="aed-availability-text">' + renderText(st.text) + '</span>' +
        (st.footnote ? '<span class="aed-availability-footnote">' + escapeHtml(st.footnote) + '</span>' : '') +
      '</span>';
    if (st.cta && st.cta.label && st.cta.href) {
      html +=
        '<a class="aed-availability-cta" href="' + escapeHtml(st.cta.href) + '"' +
        (st.cta.target ? ' target="' + escapeHtml(st.cta.target) + '" rel="noopener noreferrer"' : '') +
        '>' + escapeHtml(st.cta.label) + '</a>';
    }
    el.innerHTML = html;
  }

  function renderAll() {
    document.querySelectorAll('[data-aed-availability]').forEach(function (el) {
      render(el, state);
    });
  }

  // -- Boot ------------------------------------------------------------
  function start() {
    loadState().then(function (s) {
      state = s;
      renderAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.__availability = {
    version: VERSION,
    get: function () { return state ? Object.assign({}, state) : null; },
    set: function (next) { state = next; renderAll(); },
    refresh: function () {
      return loadState().then(function (s) { state = s; renderAll(); return s; });
    },
    render: render,
  };
})();
