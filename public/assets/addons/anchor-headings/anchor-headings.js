/*
 * Anchor Headings — drop-in click-to-link headings.
 *
 * Opt in with:
 *   <meta name="aed:anchor-headings" content="on"
 *         data-scope="main, article" data-levels="2,3,4">
 *
 * Per-page off:
 *   <html data-aed-anchor-headings="off"> ... </html>
 *
 * Behavior:
 *   - For every matching heading inside the scope, ensure it has an id
 *     (slug from text, deduplicated within the page).
 *   - Append a small # link that copies the URL-with-anchor on click.
 *
 * Public API:
 *   window.__anchorHeadings.refresh()    — re-scan after dynamic content
 *   window.__anchorHeadings.slug(text)   — exposed slug helper
 *
 * See /anchor-headings/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var meta = document.querySelector('meta[name="aed:anchor-headings"]');
  if (!meta) return;
  var on = (meta.getAttribute('content') || '').toLowerCase();
  if (on !== 'on' && on !== 'true' && on !== '1') return;

  if (document.documentElement.getAttribute('data-aed-anchor-headings') === 'off') return;

  var scopeSel = meta.getAttribute('data-scope') || 'main, article';
  var levels = (meta.getAttribute('data-levels') || '2,3,4')
    .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  var headingSel = levels.map(function (l) { return 'h' + l; }).join(',');

  // -- Helpers ----------------------------------------------------------
  var used = Object.create(null);

  function slug(text) {
    return String(text)
      .toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // strip accents
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  function uniqueId(base) {
    if (!base) base = 'section';
    var id = base;
    var i = 2;
    while (used[id] || document.getElementById(id) && document.getElementById(id) !== currentEl) {
      id = base + '-' + i;
      i += 1;
    }
    used[id] = 1;
    return id;
  }

  var currentEl = null; // used by uniqueId() to skip self when re-checking

  function svg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/>' +
      '<path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>' +
      '</svg>';
  }

  function attachOne(h) {
    if (h.dataset.aedAnchor === '1') return;
    currentEl = h;
    if (!h.id) {
      var base = slug(h.textContent || '');
      if (!base) return;
      h.id = uniqueId(base);
    } else {
      used[h.id] = 1;
    }
    h.dataset.aedAnchor = '1';
    h.setAttribute('data-aed-anchor', '');

    var a = document.createElement('a');
    a.className = 'aed-anchor-link';
    a.href = '#' + h.id;
    a.setAttribute('aria-label', 'Copy link to this section');
    a.innerHTML = svg();
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var fullUrl = window.location.origin + window.location.pathname + '#' + h.id;
      copy(fullUrl, a);
      // Update the URL in the address bar without scrolling
      try { history.replaceState(null, '', '#' + h.id); } catch (_) {}
      // Scroll into view (CSS scroll-margin-top handles the offset)
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    h.appendChild(a);
    currentEl = null;
  }

  function copy(text, btn) {
    var done = function () {
      btn.classList.add('is-copied');
      setTimeout(function () { btn.classList.remove('is-copied'); }, 1500);
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

  function scan() {
    var scopes = document.querySelectorAll(scopeSel);
    if (!scopes.length) {
      // Fall back to whole document if no scope match (small sites won't have <main>/<article>)
      document.querySelectorAll(headingSel).forEach(attachOne);
      return;
    }
    scopes.forEach(function (root) {
      root.querySelectorAll(headingSel).forEach(attachOne);
    });
  }

  function boot() {
    scan();
    // If user landed on a #section URL, re-scroll now that scroll-margin-top is set
    if (window.location.hash) {
      var t = document.getElementById(window.location.hash.slice(1));
      if (t) requestAnimationFrame(function () {
        t.scrollIntoView({ behavior: 'instant', block: 'start' });
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.__anchorHeadings = {
    version: VERSION,
    refresh: scan,
    slug: slug,
  };
})();
