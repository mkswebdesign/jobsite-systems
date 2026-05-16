/*
 * Internal Broken Links — drop-in staff link auditor.
 *
 *   <div data-aed-broken-links></div>
 *
 * Click "Run audit" → addon HEAD-fetches every same-origin link
 * (and image src) found on the current page, then walks one level
 * deep into newly-discovered same-origin pages too. Reports any
 * non-2xx status + clearly-broken assets.
 *
 * Designed for staff-only pages. The addon does no IP gating —
 * host the placeholder behind whatever gate you already use.
 *
 * Public API:
 *   window.__brokenLinks.run()
 *   window.__brokenLinks.results       — most recent results
 *
 * See /internal-broken-links/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var MAX_DEPTH = 1;            // crawl one page level deep
  var CONCURRENCY = 6;
  var ORIGIN = window.location.origin;

  function attach(host) {
    if (host.dataset.aedBlReady === '1') return;
    host.dataset.aedBlReady = '1';
    host.classList.add('aed-bl');

    host.innerHTML =
      '<div class="aed-bl-header">' +
        '<h2 class="aed-bl-title">Broken-links audit</h2>' +
        '<div class="aed-bl-actions">' +
          '<button type="button" class="aed-bl-btn" data-aed-bl-run>Run audit</button>' +
          '<button type="button" class="aed-bl-btn aed-bl-btn-ghost" data-aed-bl-clear>Clear</button>' +
        '</div>' +
      '</div>' +
      '<div class="aed-bl-status" hidden>' +
        '<span class="aed-bl-status-text">Idle</span>' +
        '<div class="aed-bl-bar"></div>' +
      '</div>' +
      '<div class="aed-bl-summary" hidden></div>' +
      '<div class="aed-bl-empty" hidden>No broken links detected.</div>' +
      '<div class="aed-bl-tablewrap"></div>';

    host.querySelector('[data-aed-bl-run]').addEventListener('click', function () { run(host); });
    host.querySelector('[data-aed-bl-clear]').addEventListener('click', function () { clear(host); });
  }

  function clear(host) {
    host.querySelector('.aed-bl-tablewrap').innerHTML = '';
    host.querySelector('.aed-bl-summary').hidden = true;
    host.querySelector('.aed-bl-empty').hidden = true;
    host.querySelector('.aed-bl-status').hidden = true;
  }

  function setStatus(host, text, pct) {
    var s = host.querySelector('.aed-bl-status');
    s.hidden = false;
    s.querySelector('.aed-bl-status-text').textContent = text;
    s.querySelector('.aed-bl-bar').style.setProperty('--aed-bl-pct', (pct || 0) + '%');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function codeClass(code) {
    if (code >= 200 && code < 400) return 'ok';
    if (code >= 400 && code < 500) return 'bad';
    if (code >= 500) return 'warn';
    return 'warn';
  }

  function isSameOrigin(href) {
    try {
      var u = new URL(href, window.location.href);
      return u.origin === ORIGIN;
    } catch (_) { return false; }
  }

  function pageUrls(doc) {
    var urls = new Set();
    doc.querySelectorAll('a[href], img[src]').forEach(function (el) {
      var href = el.getAttribute('href') || el.getAttribute('src');
      if (!href) return;
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:') || href.startsWith('#')) return;
      try {
        var u = new URL(href, window.location.href);
        u.hash = '';
        if (!isSameOrigin(u.href)) return;
        urls.add(u.href);
      } catch (_) {}
    });
    return Array.from(urls);
  }

  function fetchHead(url) {
    // Some servers (incl. xCloud) reject HEAD with 405 — fall back to GET in that case.
    return fetch(url, { method: 'HEAD' })
      .then(function (r) { return { url: url, status: r.status, kind: 'HEAD' }; })
      .catch(function () {
        return fetch(url, { method: 'GET' })
          .then(function (r) { return { url: url, status: r.status, kind: 'GET' }; })
          .catch(function () { return { url: url, status: 0, kind: 'NET' }; });
      });
  }

  function fetchHtml(url) {
    return fetch(url, { method: 'GET' })
      .then(function (r) { return r.ok ? r.text() : null; })
      .catch(function () { return null; });
  }

  // -- Worker pool --------------------------------------------------
  function pool(items, worker, onProgress) {
    return new Promise(function (resolve) {
      var idx = 0, done = 0, total = items.length;
      var results = [];
      function next() {
        if (idx >= total) {
          if (done >= total) resolve(results);
          return;
        }
        var i = idx++;
        Promise.resolve(worker(items[i])).then(function (r) {
          results.push(r);
          done += 1;
          if (onProgress) onProgress(done, total);
          next();
        });
      }
      for (var c = 0; c < CONCURRENCY && c < total; c++) next();
    });
  }

  var lastResults = [];

  function run(host) {
    var btn = host.querySelector('[data-aed-bl-run]');
    btn.disabled = true;
    clear(host);
    setStatus(host, 'Discovering links…', 0);

    var seen = new Set();
    var queue = pageUrls(document);
    queue.forEach(function (u) { seen.add(u); });
    var pagesToCrawl = queue.filter(function (u) {
      try {
        var p = new URL(u);
        // Only HTML-ish (no extension OR .html / trailing slash)
        if (/\.(jpg|jpeg|png|gif|svg|webp|avif|pdf|zip|css|js|ico)$/i.test(p.pathname)) return false;
      } catch (_) { return false; }
      return true;
    }).slice(0, 25);  // cap depth-1 pages so we don't hammer the server

    setStatus(host, 'Crawling ' + pagesToCrawl.length + ' page(s) for more links…', 5);

    pool(pagesToCrawl, function (url) {
      return fetchHtml(url).then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        pageUrls(doc).forEach(function (u) { seen.add(u); });
      });
    }).then(function () {
      var all = Array.from(seen);
      setStatus(host, 'Checking ' + all.length + ' URLs…', 15);

      return pool(all, fetchHead, function (done, total) {
        var pct = 15 + Math.round((done / total) * 85);
        setStatus(host, 'Checking ' + done + ' / ' + total + '…', pct);
      });
    }).then(function (results) {
      lastResults = results;
      var bad = results.filter(function (r) { return r.status === 0 || r.status >= 400; });
      bad.sort(function (a, b) { return b.status - a.status || a.url.localeCompare(b.url); });

      setStatus(host, 'Done — ' + results.length + ' checked', 100);
      var sum = host.querySelector('.aed-bl-summary');
      sum.hidden = false;
      sum.innerHTML =
        '<div>checked <strong>' + results.length + '</strong></div>' +
        '<div>broken <strong data-aed-bl-state="' + (bad.length ? 'bad' : 'good') + '">' + bad.length + '</strong></div>';

      var wrap = host.querySelector('.aed-bl-tablewrap');
      var empty = host.querySelector('.aed-bl-empty');
      if (!bad.length) {
        wrap.innerHTML = '';
        empty.hidden = false;
      } else {
        empty.hidden = true;
        var rows = bad.map(function (r) {
          var label = r.status || 'NET';
          return '<tr>' +
            '<td><span class="aed-bl-status-cell" data-aed-bl-code-class="' + codeClass(r.status) + '">' + escapeHtml(String(label)) + '</span></td>' +
            '<td><a href="' + escapeHtml(r.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(r.url) + '</a></td>' +
          '</tr>';
        }).join('');
        wrap.innerHTML =
          '<table class="aed-bl-table"><thead><tr><th>Status</th><th>URL</th></tr></thead><tbody>' +
          rows + '</tbody></table>';
      }

      btn.disabled = false;
    });
  }

  function scan() {
    document.querySelectorAll('[data-aed-broken-links]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__brokenLinks = {
    version: VERSION,
    run: function () {
      var host = document.querySelector('[data-aed-broken-links]');
      if (host) run(host);
    },
    get results() { return lastResults.slice(); },
  };
})();
