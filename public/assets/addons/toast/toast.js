/*
 * Toast — drop-in notification system.
 *
 * Pure programmatic API. No markup needed in the page; the addon
 * lazily creates a region container on first use.
 *
 *   window.__toast.show({
 *     kind:    'info' | 'success' | 'warn' | 'error',  // default 'info'
 *     title:   'Optional title',
 *     text:    'Body copy',
 *     action:  { label: 'Undo', onClick: () => {...} },  // optional
 *     duration: 4000,                                     // ms; 0 = sticky
 *     position: 'top-right',                              // see below
 *   })
 *
 *   window.__toast.success('Saved!')         // shortcut
 *   window.__toast.error('Network error.')
 *   window.__toast.warn('Heads up.')
 *   window.__toast.info('Tip: …')
 *   window.__toast.dismiss(toastId)
 *   window.__toast.clear()
 *
 * Default position can be set with:
 *   <meta name="aed:toast" content="bottom-right">
 *
 * Auto-bridges (off by default; opt-in attribute on the meta):
 *   <meta name="aed:toast" content="top-right" data-bridge="form,copy">
 *     - "form": listens for aed:form:success / aed:form:error events
 *     - "copy": listens for native 'copy' event
 *
 * See /toast/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var meta = document.querySelector('meta[name="aed:toast"]');
  var defaultPosition = (meta && meta.getAttribute('content')) || 'top-right';
  var bridges = (meta && meta.getAttribute('data-bridge') || '')
    .split(',').map(function (s) { return s.trim(); }).filter(Boolean);

  var POSITIONS = {
    'top-right': 1, 'top-left': 1, 'top-center': 1,
    'bottom-right': 1, 'bottom-left': 1, 'bottom-center': 1,
  };

  var ICONS = {
    info:    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    success: '<polyline points="20 6 9 17 4 12"/>',
    warn:    '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    error:   '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    close:   '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || ICONS.info) + '</svg>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // Map of position → region element
  var regions = {};
  function regionFor(pos) {
    var p = POSITIONS[pos] ? pos : defaultPosition;
    if (regions[p]) return regions[p];
    var r = document.createElement('div');
    r.className = 'aed-toast-region';
    r.setAttribute('data-aed-position', p);
    r.setAttribute('role', 'region');
    r.setAttribute('aria-label', 'Notifications');
    r.setAttribute('aria-live', 'polite');
    document.body.appendChild(r);
    regions[p] = r;
    return r;
  }

  var counter = 0;
  var toasts = {};

  function show(opts) {
    opts = opts || {};
    var id = ++counter;
    var kind = opts.kind || 'info';
    if (!ICONS[kind]) kind = 'info';
    var duration = opts.duration == null ? 4000 : opts.duration;
    var position = POSITIONS[opts.position] ? opts.position : defaultPosition;

    var region = regionFor(position);

    var el = document.createElement('div');
    el.className = 'aed-toast';
    el.setAttribute('data-aed-kind', kind);
    el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    el.setAttribute('data-aed-toast-id', String(id));

    var html =
      '<span class="aed-toast-icon">' + svg(kind) + '</span>' +
      '<div class="aed-toast-body">' +
        (opts.title ? '<span class="aed-toast-title">' + escapeHtml(opts.title) + '</span>' : '') +
        (opts.text != null ? '<span class="aed-toast-text">' + escapeHtml(opts.text) + '</span>' : '') +
      '</div>';
    el.innerHTML = html;

    if (opts.action && opts.action.label) {
      var actionEl;
      if (opts.action.href) {
        actionEl = document.createElement('a');
        actionEl.href = opts.action.href;
        if (opts.action.target) actionEl.target = opts.action.target;
      } else {
        actionEl = document.createElement('button');
        actionEl.type = 'button';
      }
      actionEl.className = 'aed-toast-action';
      actionEl.textContent = opts.action.label;
      actionEl.addEventListener('click', function () {
        if (typeof opts.action.onClick === 'function') opts.action.onClick();
        if (opts.action.dismiss !== false) dismiss(id);
      });
      el.appendChild(actionEl);
    }

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'aed-toast-close';
    close.setAttribute('aria-label', 'Dismiss');
    close.innerHTML = svg('close');
    close.addEventListener('click', function () { dismiss(id); });
    el.appendChild(close);

    region.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-open'); });

    var timer = null;
    if (duration > 0) {
      timer = setTimeout(function () { dismiss(id); }, duration);
    }

    toasts[id] = { el: el, timer: timer, region: region };
    return id;
  }

  function dismiss(id) {
    var t = toasts[id];
    if (!t) return;
    if (t.timer) clearTimeout(t.timer);
    t.el.classList.add('is-leaving');
    t.el.classList.remove('is-open');
    setTimeout(function () {
      if (t.el.parentNode) t.el.parentNode.removeChild(t.el);
      delete toasts[id];
    }, 240);
  }

  function clear() {
    Object.keys(toasts).forEach(function (id) { dismiss(parseInt(id, 10)); });
  }

  // -- Optional auto-bridges -----------------------------------------
  if (bridges.indexOf('form') > -1) {
    document.addEventListener('aed:form:success', function (e) {
      show({ kind: 'success', text: 'Sent — thanks!' });
    });
    document.addEventListener('aed:form:error', function (e) {
      show({ kind: 'error', text: (e.detail && e.detail.error && e.detail.error.message) || 'Something went wrong.' });
    });
  }
  if (bridges.indexOf('copy') > -1) {
    document.addEventListener('copy', function () {
      show({ kind: 'info', text: 'Copied to clipboard', duration: 1800 });
    });
  }

  window.__toast = {
    version: VERSION,
    show: show,
    dismiss: dismiss,
    clear: clear,
    info:    function (text, opts) { return show(Object.assign({}, opts || {}, { kind: 'info',    text: text })); },
    success: function (text, opts) { return show(Object.assign({}, opts || {}, { kind: 'success', text: text })); },
    warn:    function (text, opts) { return show(Object.assign({}, opts || {}, { kind: 'warn',    text: text })); },
    error:   function (text, opts) { return show(Object.assign({}, opts || {}, { kind: 'error',   text: text })); },
  };
})();
