/*
 * Cookie Cleaner — drop-in companion to /consent/.
 *
 * Reads the user's consent state and deletes any document.cookie
 * entries that fall under denied categories. Closes the gap that
 * /consent/ alone leaves: it stores user prefs but doesn't enforce
 * them against cookies set by third-party scripts.
 *
 * Configure with an inline JSON block (id from site.json json[]):
 *   {
 *     "always": ["theme", "aed:.*"],
 *     "categories": {
 *       "analytics":  ["_ga", "_ga_.*", "_gid", "_gcl_.*", "ph_.*", "amplitude_.*"],
 *       "marketing":  ["_fbp", "fr", "li_.*", "MUID", "ads_.*"]
 *     }
 *   }
 *
 * Each category list is an array of cookie name patterns (regex
 * literals). When the matching consent category is `false`, all
 * matching cookies are deleted across common path/domain combinations.
 *
 * Runs on:
 *   - Page load (after `aed:consent:ready` fires)
 *   - On `aed:consent:change` (so toggling off mid-session purges)
 *   - Every 30 seconds while the tab is visible (catches scripts that
 *     re-set cookies after initial purge)
 *
 * Public API:
 *   window.__cookieCleaner.scan()           — manual scan + purge now
 *   window.__cookieCleaner.list()           — array of current cookies
 *   window.__cookieCleaner.shouldKeep(name) — boolean given current consent
 *
 * See /cookie-cleaner/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var configEl = document.getElementById('aed-cookie-cleaner');
  var config = { always: [], categories: {} };
  if (configEl) {
    try {
      var loaded = JSON.parse(configEl.textContent || '{}');
      Object.assign(config, loaded);
    } catch (_) {}
  }

  // -- Pattern compilation -------------------------------------------
  function toRegex(arr) {
    return (arr || []).map(function (s) {
      // Anchor full-name match
      return new RegExp('^' + s + '$');
    });
  }
  var alwaysKeep = toRegex(config.always);
  var categoryPatterns = {};
  Object.keys(config.categories).forEach(function (cat) {
    categoryPatterns[cat] = toRegex(config.categories[cat]);
  });

  // -- Consent state lookup ------------------------------------------
  function consent() {
    if (!window.__consent || typeof window.__consent.getAll !== 'function') {
      // Without /consent/ installed, treat everything as denied EXCEPT
      // necessary. Prefer no surprises: leave cookies alone in that case.
      return null;
    }
    return window.__consent.getAll();
  }

  function shouldKeep(name) {
    // Always-keep patterns win
    for (var i = 0; i < alwaysKeep.length; i++) {
      if (alwaysKeep[i].test(name)) return true;
    }
    var c = consent();
    if (!c) return true; // safe default

    // For each category, if denied AND a pattern matches → delete
    var deniedHit = false;
    Object.keys(categoryPatterns).forEach(function (cat) {
      if (c[cat]) return; // category granted
      var pats = categoryPatterns[cat];
      for (var i = 0; i < pats.length; i++) {
        if (pats[i].test(name)) { deniedHit = true; break; }
      }
    });
    return !deniedHit;
  }

  // -- Cookie listing + deletion -------------------------------------
  function listCookies() {
    if (!document.cookie) return [];
    return document.cookie.split(';').map(function (s) {
      var i = s.indexOf('=');
      return decodeURIComponent((i > -1 ? s.slice(0, i) : s).trim());
    });
  }

  function deleteCookie(name) {
    var paths = ['/'];
    var hostParts = window.location.hostname.split('.');
    var domains = [''];
    // Try parent-domain variants too
    for (var i = 0; i < hostParts.length - 1; i++) {
      domains.push('.' + hostParts.slice(i).join('.'));
    }
    paths.forEach(function (p) {
      domains.forEach(function (d) {
        var attrs = '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=' + p + (d ? '; domain=' + d : '');
        document.cookie = encodeURIComponent(name) + attrs;
      });
    });
  }

  function scan() {
    var names = listCookies();
    var purged = [];
    names.forEach(function (n) {
      if (!shouldKeep(n)) {
        deleteCookie(n);
        purged.push(n);
      }
    });
    if (purged.length) {
      // Quiet by default; surface for staff via console
      // eslint-disable-next-line no-console
      try { console.info('[aed:cookie-cleaner] purged', purged); } catch (_) {}
    }
    return purged;
  }

  // -- Boot + listeners ----------------------------------------------
  function start() {
    scan();
    document.addEventListener('aed:consent:change', scan);
    document.addEventListener('aed:consent:ready', scan);

    // Periodic re-scan to catch cookies set by scripts after initial purge.
    var paused = false;
    document.addEventListener('visibilitychange', function () { paused = document.hidden; });
    setInterval(function () { if (!paused) scan(); }, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.__cookieCleaner = {
    version: VERSION,
    scan: scan,
    list: listCookies,
    shouldKeep: shouldKeep,
  };
})();
