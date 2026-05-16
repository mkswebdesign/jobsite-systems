/*
 * Diagnostics — drop-in staff perf overlay.
 *
 * Toggle with Ctrl+Shift+D (Cmd+Shift+D on Mac), or programmatically
 * via window.__diag.toggle(). Shows:
 *   - LCP (Largest Contentful Paint)
 *   - CLS (Cumulative Layout Shift)
 *   - INP (Interaction to Next Paint)  [Chromium]
 *   - TTFB
 *   - Connection type
 *   - Device pixel ratio + viewport
 *   - DOM size + JS heap (if exposed)
 *
 * Doesn't IP-gate — keystroke obscurity is the gate. Don't enable on
 * a public site if you don't want curious visitors discovering it.
 *
 * Public API:
 *   window.__diag.toggle()
 *   window.__diag.show()
 *   window.__diag.hide()
 *   window.__diag.snapshot()    — returns current metrics object
 *
 * See /diagnostics/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var state = {
    lcp: null, cls: 0, inp: null, ttfb: null,
  };
  var visible = false;
  var panel = null;

  // -- Web Vitals via PerformanceObserver -----------------------------
  function observe() {
    if (!('PerformanceObserver' in window)) return;

    try {
      var lcpObs = new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        var last = entries[entries.length - 1];
        if (last) state.lcp = last.startTime;
        if (visible) render();
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}

    try {
      var clsObs = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (e) {
          if (!e.hadRecentInput) state.cls += e.value;
        });
        if (visible) render();
      });
      clsObs.observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}

    try {
      var inpObs = new PerformanceObserver(function (list) {
        list.getEntries().forEach(function (e) {
          if (!state.inp || e.duration > state.inp) state.inp = e.duration;
        });
        if (visible) render();
      });
      inpObs.observe({ type: 'event', buffered: true, durationThreshold: 16 });
    } catch (_) {}

    try {
      var nav = performance.getEntriesByType('navigation')[0];
      if (nav) state.ttfb = nav.responseStart;
    } catch (_) {}
  }

  // -- Thresholds (Web Vitals "Good" boundaries) ---------------------
  function lcpState(v) { if (v == null) return ''; return v < 2500 ? 'good' : v < 4000 ? 'warn' : 'poor'; }
  function clsState(v) { if (v == null) return ''; return v < 0.1 ? 'good' : v < 0.25 ? 'warn' : 'poor'; }
  function inpState(v) { if (v == null) return ''; return v < 200 ? 'good' : v < 500 ? 'warn' : 'poor'; }

  function fmtMs(v) { return v == null ? '—' : (v < 1000 ? Math.round(v) + ' ms' : (v / 1000).toFixed(2) + ' s'); }
  function fmtKb(b) { return b == null ? '—' : (b < 1024 * 1024 ? Math.round(b / 1024) + ' KB' : (b / 1024 / 1024).toFixed(2) + ' MB'); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function snapshot() {
    var nav = performance.getEntriesByType('navigation')[0];
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var heap = performance && performance.memory && performance.memory.usedJSHeapSize;
    return {
      lcp: state.lcp,
      cls: state.cls,
      inp: state.inp,
      ttfb: state.ttfb || (nav ? nav.responseStart : null),
      connection: conn ? (conn.effectiveType + (conn.saveData ? ' · saver' : '')) : '—',
      dpr: window.devicePixelRatio,
      viewport: window.innerWidth + ' × ' + window.innerHeight,
      domNodes: document.getElementsByTagName('*').length,
      jsHeap: heap || null,
    };
  }

  // -- Render ---------------------------------------------------------
  function build() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'aed-diag';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Diagnostics overlay');
    panel.hidden = true;

    panel.innerHTML =
      '<div class="aed-diag-header">' +
        '<span class="aed-diag-title">Diagnostics</span>' +
        '<button type="button" class="aed-diag-close" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="aed-diag-body"></div>' +
      '<div class="aed-diag-foot">Ctrl+Shift+D to toggle · v' + VERSION + '</div>';

    panel.querySelector('.aed-diag-close').addEventListener('click', hide);
    document.body.appendChild(panel);
    return panel;
  }

  function row(key, val, state) {
    return '<div class="aed-diag-row">' +
      '<span class="aed-diag-key">' + escapeHtml(key) + '</span>' +
      '<span class="aed-diag-val"' + (state ? ' data-aed-state="' + state + '"' : '') + '>' + escapeHtml(val) + '</span>' +
    '</div>';
  }

  function render() {
    if (!panel || panel.hidden) return;
    var s = snapshot();
    var body = panel.querySelector('.aed-diag-body');
    body.innerHTML =
      row('LCP',     fmtMs(s.lcp),  lcpState(s.lcp)) +
      row('CLS',     s.cls != null ? s.cls.toFixed(3) : '—', clsState(s.cls)) +
      row('INP',     fmtMs(s.inp),  inpState(s.inp)) +
      row('TTFB',    fmtMs(s.ttfb), '') +
      row('Conn',    s.connection,  '') +
      row('DPR',     String(s.dpr), '') +
      row('Viewport', s.viewport,   '') +
      row('DOM',     String(s.domNodes), '') +
      (s.jsHeap ? row('JS heap', fmtKb(s.jsHeap), '') : '');
  }

  // -- Toggle / show / hide ------------------------------------------
  function show() {
    build();
    panel.hidden = false;
    visible = true;
    render();
  }
  function hide() {
    if (!panel) return;
    panel.hidden = true;
    visible = false;
  }
  function toggle() { (panel && !panel.hidden) ? hide() : show(); }

  // Hotkey
  document.addEventListener('keydown', function (e) {
    var combo = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd');
    if (combo) {
      e.preventDefault();
      toggle();
    }
  });

  // Re-render every 2s while visible (catches new INP / late CLS)
  setInterval(function () { if (visible) render(); }, 2000);

  observe();

  window.__diag = {
    version: VERSION,
    toggle: toggle,
    show: show,
    hide: hide,
    snapshot: snapshot,
  };
})();
