/*
 * Uptime Status — drop-in trust pill.
 *
 * Hydrates every <a/div data-aed-uptime> from one of three providers:
 *
 *   <meta name="aed:uptime" content="instatus:<your-subdomain>">
 *   <meta name="aed:uptime" content="statuspage:<your-page-id>">
 *   <meta name="aed:uptime" content="custom:https://your-host/status.json">
 *
 * Custom-provider JSON shape:
 *   { "status": "operational" | "degraded" | "outage" | "maintenance",
 *     "label":  "All systems operational",
 *     "pageUrl": "https://status.example.com/" }
 *
 * Element opt-in:
 *   <a data-aed-uptime></a>            -> renders as link to status page
 *   <span data-aed-uptime></span>      -> renders inline (no link)
 *   <div data-aed-uptime data-aed-variant="bare"></div>
 *
 * Public API:
 *   window.__uptime.refresh()    bypass cache, re-fetch
 *   window.__uptime.get()        last-known result (read-only)
 *   window.__uptime.set(state)   override + re-render
 *
 * See /uptime-status/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var CACHE_KEY = 'aed:uptime:cache';
  var CACHE_TTL_MS = 60_000;

  // -- Resolve provider from meta -------------------------------------
  var meta = document.querySelector('meta[name="aed:uptime"]');
  if (!meta) return;
  var token = (meta.getAttribute('content') || '').trim();
  if (!token) return;

  var m = token.match(/^([a-z]+):(.+)$/i);
  if (!m) return;
  var providerName = m[1].toLowerCase();
  var ident = m[2];

  var provider = makeProvider(providerName, ident);
  if (!provider) return;

  // -- Targets -------------------------------------------------------
  function targets() { return document.querySelectorAll('[data-aed-uptime]'); }
  if (!targets().length) {
    // Nothing to hydrate, but still expose the API
    window.__uptime = stubApi();
    return;
  }

  // -- Cache ---------------------------------------------------------
  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (Date.now() - c.ts > CACHE_TTL_MS) return null;
      return c.data;
    } catch (_) { return null; }
  }
  function writeCache(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data })); } catch (_) {}
  }

  // -- Fetch + parse -------------------------------------------------
  function fetchStatus() {
    var cached = readCache();
    if (cached) return Promise.resolve(cached);
    paintLoading();
    return fetch(provider.url, { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (raw) {
        var parsed = provider.parse(raw);
        if (!parsed.pageUrl) parsed.pageUrl = provider.pageUrl;
        writeCache(parsed);
        return parsed;
      })
      .catch(function (err) {
        // On error, return a minimal "unknown" but don't render noise
        return { status: 'unknown', label: 'Status unavailable', pageUrl: provider.pageUrl };
      });
  }

  // -- Render -------------------------------------------------------
  var current = null;

  function paint(state) {
    current = state;
    targets().forEach(function (el) {
      if (state.status === 'unknown') {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      el.classList.add('aed-uptime');
      el.setAttribute('data-aed-status', state.status);
      el.setAttribute('aria-label', 'Uptime status: ' + state.label);
      el.innerHTML =
        '<span class="aed-uptime-dot" aria-hidden="true"></span>' +
        '<span class="aed-uptime-label">' + escapeHtml(state.label) + '</span>';
      // Make it a link if it's an anchor element and we have a page URL
      if (el.tagName === 'A') {
        if (state.pageUrl) {
          el.href = state.pageUrl;
          el.target = '_blank';
          el.rel = 'noopener noreferrer';
        } else {
          el.removeAttribute('href');
        }
      }
    });
  }

  function paintLoading() {
    targets().forEach(function (el) {
      el.classList.add('aed-uptime');
      el.setAttribute('data-aed-status', 'loading');
      el.innerHTML =
        '<span class="aed-uptime-dot" aria-hidden="true"></span>' +
        '<span class="aed-uptime-label">Checking…</span>';
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // -- Boot ---------------------------------------------------------
  function start() { fetchStatus().then(paint); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.__uptime = {
    version: VERSION,
    get: function () { return current ? Object.assign({}, current) : null; },
    set: function (next) { paint(next); },
    refresh: function () {
      try { sessionStorage.removeItem(CACHE_KEY); } catch (_) {}
      return fetchStatus().then(function (s) { paint(s); return s; });
    },
  };

  function stubApi() {
    return { version: VERSION, get: function(){return null;}, set: function(){}, refresh: function(){return Promise.resolve(null);} };
  }

  // ===================================================================
  // Provider builders
  // ===================================================================
  function makeProvider(name, id) {
    if (name === 'instatus') return providerInstatus(id);
    if (name === 'statuspage') return providerStatuspage(id);
    if (name === 'custom') return providerCustom(id);
    return null;
  }

  function providerInstatus(sub) {
    return {
      url: 'https://' + sub + '.instatus.com/summary.json',
      pageUrl: 'https://' + sub + '.instatus.com/',
      parse: function (d) {
        var s = (d && d.page && d.page.status) || '';
        if (s === 'UP') return { status: 'operational', label: 'All systems operational' };
        if (s === 'HASISSUES') return { status: 'degraded', label: 'Some systems experiencing issues' };
        if (s === 'UNDERMAINTENANCE') return { status: 'maintenance', label: 'Under maintenance' };
        return { status: 'unknown', label: 'Status unknown' };
      },
    };
  }

  function providerStatuspage(id) {
    return {
      url: 'https://' + id + '.statuspage.io/api/v2/status.json',
      pageUrl: 'https://' + id + '.statuspage.io/',
      parse: function (d) {
        var ind = (d && d.status && d.status.indicator) || '';
        var desc = (d && d.status && d.status.description) || '';
        if (ind === 'none')        return { status: 'operational', label: desc || 'All systems operational' };
        if (ind === 'minor')       return { status: 'degraded',    label: desc || 'Minor service disruption' };
        if (ind === 'major')       return { status: 'outage',      label: desc || 'Major service disruption' };
        if (ind === 'critical')    return { status: 'outage',      label: desc || 'Critical service outage' };
        if (ind === 'maintenance') return { status: 'maintenance', label: desc || 'Under maintenance' };
        return { status: 'unknown', label: desc || 'Status unknown' };
      },
    };
  }

  function providerCustom(url) {
    return {
      url: url,
      pageUrl: null,
      parse: function (d) {
        return {
          status: (d && d.status) || 'unknown',
          label:  (d && (d.label || d.message)) || 'Status',
          pageUrl: (d && d.pageUrl) || null,
        };
      },
    };
  }
})();
