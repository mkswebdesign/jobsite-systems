/*
 * Internal Versions — drop-in addon inventory dashboard.
 *
 * For every <div data-aed-versions> on the page:
 *   - Scans <link href="/assets/addons/<name>/..."> and <script src="/assets/addons/<name>/...">
 *     to enumerate which addons are loaded right now.
 *   - For each, attempts to fetch /assets/addons/<name>/addon.json to retrieve
 *     the manifest, then probes for a VERSION constant in the loaded
 *     script source (best-effort — surfaces "—" if unparseable).
 *   - Renders a table of: name | files loaded | version (from VERSION)
 *
 * Recommended placement: a noindex staff page (/internal-versions/ or
 * inside /internal-fork/). The addon itself does no IP gating — host
 * the page behind whatever gate you already use.
 *
 *   <div data-aed-versions></div>
 *
 * Public API:
 *   window.__internalVersions.refresh()   — re-scan
 *   window.__internalVersions.list()      — array of { name, css, js, manifest }
 *
 * See /internal-versions/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function discover() {
    var registry = Object.create(null);

    function bucket(name) {
      if (!registry[name]) registry[name] = { name: name, css: [], js: [] };
      return registry[name];
    }

    document.querySelectorAll('link[rel="stylesheet"][href*="/assets/addons/"]').forEach(function (l) {
      var m = (l.getAttribute('href') || '').match(/\/assets\/addons\/([^/]+)\/([^?#]+)/);
      if (m) bucket(m[1]).css.push(m[2]);
    });
    document.querySelectorAll('script[src*="/assets/addons/"]').forEach(function (s) {
      var m = (s.getAttribute('src') || '').match(/\/assets\/addons\/([^/]+)\/([^?#]+)/);
      if (m) bucket(m[1]).js.push(m[2]);
    });

    return Object.values(registry).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function fetchManifest(name) {
    return fetch('/assets/addons/' + name + '/addon.json', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function fetchVersion(name, jsFile) {
    if (!jsFile) return Promise.resolve(null);
    return fetch('/assets/addons/' + name + '/' + jsFile)
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (src) {
        if (!src) return null;
        var m = src.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);
        return m ? m[1] : null;
      })
      .catch(function () { return null; });
  }

  function row(addon) {
    return Promise.all([
      fetchManifest(addon.name),
      fetchVersion(addon.name, addon.js[0]),
    ]).then(function (results) {
      addon.manifest = results[0];
      addon.version = results[1];
      return addon;
    });
  }

  function paint(host, addons) {
    if (!addons.length) {
      host.innerHTML = '<div class="aed-iv-empty"><strong>No addons detected on this page.</strong><br>Either nothing is enabled in <code>site.json</code> or this page sits outside the standard layout.</div>';
      return;
    }
    var html =
      '<div class="aed-iv-header">' +
        '<h2 class="aed-iv-title">Loaded addons (this page)</h2>' +
        '<span class="aed-iv-counts">' + addons.length + ' total</span>' +
      '</div>' +
      '<table class="aed-iv-table"><thead><tr>' +
        '<th>Addon</th><th>Files</th><th>Version</th>' +
      '</tr></thead><tbody>';
    addons.forEach(function (a) {
      var pills = '';
      a.css.forEach(function (f) { pills += '<span class="aed-iv-pill" data-aed-iv-kind="css">' + escapeHtml(f) + '</span>'; });
      a.js.forEach(function (f) { pills += '<span class="aed-iv-pill" data-aed-iv-kind="js">' + escapeHtml(f) + '</span>'; });
      var v = a.version || '—';
      var state = a.version ? 'ok' : 'missing';
      html +=
        '<tr>' +
          '<td class="aed-iv-name"><a href="/assets/addons/' + escapeHtml(a.name) + '/README.md">' + escapeHtml(a.name) + '</a></td>' +
          '<td>' + pills + '</td>' +
          '<td><span class="aed-iv-version" data-aed-iv-state="' + state + '">' + escapeHtml(v) + '</span></td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    host.innerHTML = html;
  }

  function hydrate(host) {
    if (host.dataset.aedIvReady === '1') return;
    host.dataset.aedIvReady = '1';
    host.classList.add('aed-iv');
    host.innerHTML = '<div class="aed-iv-empty">Loading…</div>';

    var addons = discover();
    Promise.all(addons.map(row)).then(function (filled) {
      paint(host, filled);
    });
  }

  function scan() {
    document.querySelectorAll('[data-aed-versions]').forEach(hydrate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__internalVersions = {
    version: VERSION,
    refresh: scan,
    list: discover,
  };
})();
