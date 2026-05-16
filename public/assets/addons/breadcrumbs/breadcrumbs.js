/*
 * Breadcrumbs — drop-in URL-derived trail.
 *
 * For every <nav data-aed-breadcrumbs> on the page:
 *   - Splits window.location.pathname into segments
 *   - Resolves a label per segment (config map → page meta → titlecase)
 *   - Renders the trail with separators
 *   - Last segment is the current page (not a link)
 *
 * Also emits a single document-level BreadcrumbList JSON-LD <script>
 * for SEO (only once per page, even if multiple breadcrumb elements
 * exist).
 *
 * Configure with an inline JSON block (id from site.json json[]):
 *   {
 *     "home":   { "label": "Home", "href": "/" },
 *     "separator": "/",
 *     "labels": {
 *       "/internal-fork/": "Internal · Fork Guide",
 *       "/internal-fork/options/": "Editor Options"
 *     }
 *   }
 *
 * Per-page label override (when no entry in `labels` map):
 *   <meta name="aed:breadcrumbs:label" content="Custom Page Label">
 *
 * Per-element variants:
 *   <nav data-aed-breadcrumbs></nav>
 *   <nav data-aed-breadcrumbs data-aed-variant="ghost"></nav>     (mute)
 *   <nav data-aed-breadcrumbs data-aed-skip-schema="true"></nav>  (no JSON-LD emit)
 *
 * Public API:
 *   window.__breadcrumbs.refresh()    re-render all
 *   window.__breadcrumbs.trail()      array of { href, label } for current path
 *
 * See /breadcrumbs/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var configEl = document.getElementById('aed-breadcrumbs');
  var config = { home: { label: 'Home', href: '/' }, separator: '/', labels: {} };
  if (configEl) {
    try {
      var loaded = JSON.parse(configEl.textContent || '{}');
      Object.assign(config, loaded);
      if (loaded.home) config.home = Object.assign({ label: 'Home', href: '/' }, loaded.home);
    } catch (_) {}
  }

  function titlecase(slug) {
    return slug.replace(/-+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function pageMetaLabel() {
    var m = document.querySelector('meta[name="aed:breadcrumbs:label"]');
    return m ? m.getAttribute('content') : null;
  }

  function trail() {
    var path = window.location.pathname;
    var segs = path.split('/').filter(Boolean);
    var crumbs = [{ href: config.home.href, label: config.home.label }];

    var acc = '';
    for (var i = 0; i < segs.length; i++) {
      acc += '/' + segs[i];
      var pathKey = acc + (i < segs.length - 1 ? '/' : '/'); // normalize trailing /
      var isCurrent = i === segs.length - 1;
      var label = config.labels[pathKey] || config.labels[acc];
      if (!label && isCurrent) label = pageMetaLabel();
      if (!label) label = titlecase(decodeURIComponent(segs[i]));
      crumbs.push({ href: pathKey, label: label, current: isCurrent });
    }

    return crumbs;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function render(el) {
    var crumbs = trail();
    if (crumbs.length < 2) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.classList.add('aed-breadcrumbs');
    el.setAttribute('aria-label', 'Breadcrumb');

    var sep = config.separator || '/';
    var html = '';
    crumbs.forEach(function (c, i) {
      if (i > 0) {
        html += '<span class="aed-breadcrumbs-sep" aria-hidden="true">' + escapeHtml(sep) + '</span>';
      }
      if (c.current) {
        html += '<span class="aed-breadcrumbs-current" aria-current="page">' + escapeHtml(c.label) + '</span>';
      } else {
        html += '<a href="' + escapeHtml(c.href) + '">' + escapeHtml(c.label) + '</a>';
      }
    });
    el.innerHTML = html;
  }

  function emitSchema() {
    if (document.getElementById('aed-breadcrumbs-schema')) return;
    var firstEl = document.querySelector('[data-aed-breadcrumbs]');
    if (firstEl && firstEl.getAttribute('data-aed-skip-schema') === 'true') return;

    var crumbs = trail();
    if (crumbs.length < 2) return;

    var origin = window.location.origin;
    var schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map(function (c, i) {
        return {
          '@type': 'ListItem',
          position: i + 1,
          name: c.label,
          item: origin + c.href,
        };
      }),
    };

    var s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'aed-breadcrumbs-schema';
    s.textContent = JSON.stringify(schema);
    document.head.appendChild(s);
  }

  function scan() {
    document.querySelectorAll('[data-aed-breadcrumbs]').forEach(render);
    emitSchema();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__breadcrumbs = {
    version: VERSION,
    refresh: scan,
    trail: trail,
  };
})();
