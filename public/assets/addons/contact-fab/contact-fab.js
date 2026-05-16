/*
 * Contact FAB — drop-in floating action button.
 *
 * Round button bottom-right. Click to open a panel listing contact
 * actions (call, email, message, custom). Auto-discovers tel:/mailto:
 * links from the page; optional JSON override.
 *
 * Public API:
 *   window.__contactFab.open()
 *   window.__contactFab.close()
 *   window.__contactFab.toggle()
 *   window.__contactFab.config       // resolved config (read-only)
 *
 * See /contact-fab/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';
  var SS_BUBBLE_SEEN = 'aed:contact-fab:bubble-seen';
  var SS_DISMISS = 'aed:contact-fab:dismissed';

  // -- Config defaults --------------------------------------------------
  var defaults = {
    label: 'Talk to us',
    panelTitle: 'How can we help?',
    panelSubtitle: 'Pick the channel that suits you.',
    welcomeBubble: 'Hi! Got a question?',
    welcomeBubbleDelay: 4000,        // ms after page load
    hideOnPaths: ['/contact/'],
    actions: null,                   // null = auto-discover; or an array
    footer: null,                    // optional small footnote in panel
  };

  var config = Object.assign({}, defaults);
  (function loadConfig() {
    var el = document.getElementById('aed-contact-fab-config');
    if (!el) return;
    try {
      var cfg = JSON.parse(el.textContent || '{}');
      Object.keys(cfg).forEach(function (k) { config[k] = cfg[k]; });
    } catch (_) {}
  })();

  // -- Hide-on-path -----------------------------------------------------
  var path = window.location.pathname;
  for (var i = 0; i < config.hideOnPaths.length; i++) {
    var p = config.hideOnPaths[i];
    if (path === p || path === p + '/' || (p.endsWith('/') && path === p.slice(0, -1))) return;
  }

  // Dismissed this session?
  try { if (sessionStorage.getItem(SS_DISMISS) === '1') return; } catch (_) {}

  // -- Auto-discover actions if not configured --------------------------
  function discover() {
    var found = [];
    var tel = document.querySelector('a[href^="tel:"]');
    if (tel) {
      var raw = tel.getAttribute('href').replace(/^tel:/, '');
      found.push({
        kind: 'phone',
        label: 'Call us',
        sublabel: displayPhone(raw),
        href: 'tel:' + raw.replace(/[^+\d]/g, ''),
      });
    }
    var mail = document.querySelector('a[href^="mailto:"]');
    if (mail) {
      var addr = mail.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
      found.push({
        kind: 'email',
        label: 'Email us',
        sublabel: addr,
        href: 'mailto:' + addr,
      });
    }
    // Always offer a contact-page entry if we're not currently on it
    found.push({
      kind: 'message',
      label: 'Send a message',
      sublabel: 'Use the contact form',
      href: '/contact/',
    });
    return found;
  }

  var actions = Array.isArray(config.actions) && config.actions.length
    ? config.actions
    : discover();
  if (Array.isArray(config.prependActions) && config.prependActions.length) {
    actions = config.prependActions.concat(actions);
  }
  if (Array.isArray(config.appendActions) && config.appendActions.length) {
    actions = actions.concat(config.appendActions);
  }
  if (!actions.length) return;

  // -- Helpers ---------------------------------------------------------
  function displayPhone(raw) {
    var d = raw.replace(/[^\d]/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    if (d.length === 10) return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    return raw;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  var ICONS = {
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/>',
    email: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  function svg(iconName, klass) {
    var path = ICONS[iconName] || ICONS.message;
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      (klass ? ' class="' + klass + '"' : '') + '>' + path + '</svg>'
    );
  }

  // -- DOM -------------------------------------------------------------
  var fab = null, panel = null, bubble = null;

  function buildFab() {
    if (fab) return fab;
    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'contact-fab';
    fab.setAttribute('aria-label', config.label);
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-haspopup', 'dialog');
    fab.innerHTML = svg('chat', 'contact-fab-icon');
    fab.addEventListener('click', toggle);
    document.body.appendChild(fab);
    requestAnimationFrame(function () { fab.classList.add('is-ready'); });
    return fab;
  }

  function buildPanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'contact-fab-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', config.panelTitle);
    panel.hidden = true;

    var header = document.createElement('div');
    header.className = 'contact-fab-panel-header';
    var title = document.createElement('p');
    title.className = 'contact-fab-panel-title';
    title.textContent = config.panelTitle;
    header.appendChild(title);
    if (config.panelSubtitle) {
      var sub = document.createElement('p');
      sub.className = 'contact-fab-panel-subtitle';
      sub.textContent = config.panelSubtitle;
      header.appendChild(sub);
    }
    panel.appendChild(header);

    var list = document.createElement('div');
    list.className = 'contact-fab-actions';
    actions.forEach(function (a) {
      var row = document.createElement('a');
      row.className = 'contact-fab-action';
      row.href = a.href;
      if (a.target) row.target = a.target;
      if (a.target === '_blank') row.rel = 'noopener noreferrer';
      row.setAttribute('data-aed-fab', a.kind || 'action');

      var ic = document.createElement('span');
      ic.className = 'contact-fab-action-icon';
      ic.innerHTML = svg(a.icon || a.kind || 'message');

      var txt = document.createElement('span');
      txt.className = 'contact-fab-action-text';
      var lbl = document.createElement('span');
      lbl.className = 'contact-fab-action-label';
      lbl.textContent = a.label;
      txt.appendChild(lbl);
      if (a.sublabel) {
        var sl = document.createElement('span');
        sl.className = 'contact-fab-action-sublabel';
        sl.textContent = a.sublabel;
        txt.appendChild(sl);
      }

      row.appendChild(ic);
      row.appendChild(txt);
      row.addEventListener('click', function () { close(); });
      list.appendChild(row);
    });
    panel.appendChild(list);

    if (config.footer) {
      var ft = document.createElement('div');
      ft.className = 'contact-fab-panel-footer';
      ft.textContent = config.footer;
      panel.appendChild(ft);
    }

    document.body.appendChild(panel);
    return panel;
  }

  // -- Bubble (one-time welcome) ---------------------------------------
  function maybeBubble() {
    if (!config.welcomeBubble) return;
    try { if (sessionStorage.getItem(SS_BUBBLE_SEEN) === '1') return; } catch (_) {}
    setTimeout(function () {
      if (!fab || fab.classList.contains('is-open')) return;
      bubble = document.createElement('div');
      bubble.className = 'contact-fab-bubble';
      bubble.setAttribute('role', 'status');
      var text = document.createElement('span');
      text.className = 'contact-fab-bubble-text';
      text.textContent = config.welcomeBubble;
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'contact-fab-bubble-close';
      x.setAttribute('aria-label', 'Dismiss');
      x.innerHTML = svg('close');
      x.addEventListener('click', dismissBubble);
      bubble.appendChild(text);
      bubble.appendChild(x);
      bubble.addEventListener('click', function (e) {
        if (e.target.closest('.contact-fab-bubble-close')) return;
        dismissBubble();
        open();
      });
      document.body.appendChild(bubble);
      requestAnimationFrame(function () { bubble.classList.add('is-open'); });
      fab.classList.add('has-bubble');
    }, config.welcomeBubbleDelay);
  }
  function dismissBubble() {
    try { sessionStorage.setItem(SS_BUBBLE_SEEN, '1'); } catch (_) {}
    if (!bubble) return;
    bubble.classList.remove('is-open');
    fab && fab.classList.remove('has-bubble');
    setTimeout(function () { if (bubble) { bubble.remove(); bubble = null; } }, 250);
  }

  // -- Open / close ----------------------------------------------------
  function open() {
    buildPanel();
    panel.hidden = false;
    requestAnimationFrame(function () { panel.classList.add('is-open'); });
    fab.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', escClose);
    document.addEventListener('click', outsideClose, true);
    dismissBubble();
  }
  function close() {
    if (!panel) return;
    panel.classList.remove('is-open');
    fab.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
    setTimeout(function () { if (panel) panel.hidden = true; }, 200);
    document.removeEventListener('keydown', escClose);
    document.removeEventListener('click', outsideClose, true);
  }
  function toggle() { (panel && panel.classList.contains('is-open')) ? close() : open(); }
  function escClose(e) { if (e.key === 'Escape') close(); }
  function outsideClose(e) {
    if (!panel || panel.hidden) return;
    if (panel.contains(e.target) || fab.contains(e.target)) return;
    close();
  }

  // -- Boot ------------------------------------------------------------
  function start() {
    var pendingConsent = document.querySelector('.consent-banner:not([hidden])');
    if (pendingConsent) {
      document.addEventListener('aed:consent:change', function once() {
        document.removeEventListener('aed:consent:change', once);
        buildFab();
        maybeBubble();
      });
    } else {
      buildFab();
      maybeBubble();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.__contactFab = {
    version: VERSION,
    open: open,
    close: close,
    toggle: toggle,
    config: config,
    reset: function () {
      try { sessionStorage.removeItem(SS_BUBBLE_SEEN); sessionStorage.removeItem(SS_DISMISS); } catch (_) {}
    },
  };
})();
