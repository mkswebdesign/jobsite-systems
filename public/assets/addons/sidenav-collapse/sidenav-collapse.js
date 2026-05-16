/*
 * Sidenav Collapse — drop-in collapsible nav groups.
 *
 *   <nav data-aed-sidenav data-aed-sidenav-key="docs">
 *     <details class="aed-sn-group" data-aed-sn-group="getting-started" open>
 *       <summary>Getting started</summary>
 *       <ul class="aed-sn-list">
 *         <li><a href="/docs/install/">Install</a></li>
 *         <li><a href="/docs/quickstart/">Quickstart</a></li>
 *       </ul>
 *     </details>
 *     <details class="aed-sn-group" data-aed-sn-group="reference">
 *       <summary>Reference</summary>
 *       <ul class="aed-sn-list">
 *         <li><a href="/docs/api/">API</a></li>
 *       </ul>
 *     </details>
 *   </nav>
 *
 * Per-container attributes:
 *   data-aed-sidenav            opt-in marker
 *   data-aed-sidenav-key        localStorage key prefix (default 'default')
 *
 * Per-group attributes:
 *   data-aed-sn-group           required — unique group id within the sidenav
 *   open                        native attribute — initial state
 *
 * Behavior:
 *   - Each <details> open/close state persists in localStorage
 *     under key "aed:sidenav:<key>:<group>".
 *   - Active link auto-detected by URL match (current path startsWith
 *     link href). Active link's parent group is auto-opened.
 *
 * Public API:
 *   window.__sidenav.refresh()
 *
 * See /sidenav-collapse/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function attach(nav) {
    if (nav.dataset.aedSnReady === '1') return;
    nav.dataset.aedSnReady = '1';

    var key = nav.getAttribute('data-aed-sidenav-key') || 'default';

    // Restore open/close state per group
    nav.querySelectorAll('details.aed-sn-group[data-aed-sn-group]').forEach(function (d) {
      var gid = d.getAttribute('data-aed-sn-group');
      try {
        var stored = localStorage.getItem('aed:sidenav:' + key + ':' + gid);
        if (stored === '1') d.open = true;
        else if (stored === '0') d.open = false;
      } catch (_) {}
      d.addEventListener('toggle', function () {
        try { localStorage.setItem('aed:sidenav:' + key + ':' + gid, d.open ? '1' : '0'); } catch (_) {}
      });
    });

    // Mark active link by URL match
    var path = window.location.pathname;
    var allLinks = nav.querySelectorAll('a[href]');
    var bestMatch = null;
    var bestLen = 0;
    allLinks.forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        var u = new URL(href, window.location.origin);
        if (u.origin !== window.location.origin) return;
        // Match if path equals or starts with link path (treating both as ending in /)
        var ap = path.endsWith('/') ? path : path + '/';
        var bp = u.pathname.endsWith('/') ? u.pathname : u.pathname + '/';
        if (ap === bp || ap.startsWith(bp)) {
          if (bp.length > bestLen) { bestMatch = a; bestLen = bp.length; }
        }
      } catch (_) {}
    });

    if (bestMatch) {
      bestMatch.classList.add('is-active');
      // Auto-open the parent group
      var parent = bestMatch.closest('details.aed-sn-group');
      if (parent) parent.open = true;
    }
  }

  function scan() {
    document.querySelectorAll('[data-aed-sidenav]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__sidenav = {
    version: VERSION,
    refresh: scan,
  };
})();
