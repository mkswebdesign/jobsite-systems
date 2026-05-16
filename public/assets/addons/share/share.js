/*
 * Share — drop-in social share buttons.
 *
 * Hydrates every <element data-aed-share> with a row of share buttons.
 * Network selection comes from the attribute value (comma-separated)
 * or, if empty, the page-level default.
 *
 * No third-party scripts injected. Twitter / LinkedIn / Bluesky /
 * Facebook / Reddit / Hacker News / WhatsApp / Email / Copy-link.
 *
 *   <div data-aed-share></div>
 *   <div data-aed-share="twitter,linkedin,copy"></div>
 *   <div data-aed-share="twitter,bluesky,copy" data-aed-variant="pill"></div>
 *   <div data-aed-share data-aed-share-url="..." data-aed-share-title="..."></div>
 *   <div data-aed-share data-aed-share-label="Tell a friend"></div>
 *
 * Page-level default network list:
 *   <meta name="aed:share-default" content="twitter,linkedin,email,copy">
 *
 * Public API:
 *   window.__share.networks
 *   window.__share.attach(el)
 *   window.__share.url(network, { url, title, text })
 *
 * See /share/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var DEFAULT_NETWORKS = ['twitter', 'linkedin', 'email', 'copy'];
  var pageDefaults = (function () {
    var m = document.querySelector('meta[name="aed:share-default"]');
    if (!m) return DEFAULT_NETWORKS;
    var v = (m.getAttribute('content') || '').split(',').map(trim).filter(Boolean);
    return v.length ? v : DEFAULT_NETWORKS;
  })();

  function trim(s) { return String(s).trim(); }

  // -- Network registry ----------------------------------------------
  var NETWORKS = {
    twitter: {
      name: 'X (Twitter)',
      icon: '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
      build: function (p) {
        var u = new URL('https://twitter.com/intent/tweet');
        if (p.text) u.searchParams.set('text', p.text);
        u.searchParams.set('url', p.url);
        return u.toString();
      },
    },
    bluesky: {
      name: 'Bluesky',
      icon: '<path d="M5.5 4.5C8 6 11 9 12 13c1-4 4-7 6.5-8.5C20 4 22 6 22 9.5c0 1-.5 2-1 2.5-.5.4-1 .8-1.5 1 .8.2 1.5.8 1.5 2 0 1-1 2-2 2.5-.5.2-1 .3-1.5.4 1 .5 1 2 0 3s-2 1.5-3 1c-.7-.4-1.5-1.2-2-2-.5.8-1.3 1.6-2 2-1 .5-2 .5-3-.5s-1-2.5 0-3c-.5-.1-1-.2-1.5-.4-1-.5-2-1.5-2-2.5 0-1.2.7-1.8 1.5-2-.5-.2-1-.6-1.5-1-.5-.5-1-1.5-1-2.5C2 6 4 4 5.5 4.5z"/>',
      build: function (p) {
        var text = (p.text ? p.text + ' ' : '') + p.url;
        return 'https://bsky.app/intent/compose?text=' + encodeURIComponent(text);
      },
    },
    linkedin: {
      name: 'LinkedIn',
      icon: '<path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>',
      build: function (p) {
        return 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(p.url);
      },
    },
    facebook: {
      name: 'Facebook',
      icon: '<path d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 011-1h3v-4h-3a5 5 0 00-5 5v2.01h-2l-.396 3.98h2.396z"/>',
      build: function (p) {
        return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(p.url);
      },
    },
    reddit: {
      name: 'Reddit',
      icon: '<path d="M12 2c5.5 0 10 4 10 9 0 5-4.5 9-10 9S2 16 2 11c0-5 4.5-9 10-9zm6 9a2 2 0 00-3.4-1.4 7.5 7.5 0 00-4-1.1l.7-3.3 2.3.5a1.4 1.4 0 102.6-1 1.4 1.4 0 00-2.5.4l-2.6-.6c-.2 0-.3.1-.4.3l-.8 3.7a7.5 7.5 0 00-4 1.1A2 2 0 005 13c0 .5.2 1 .5 1.3v.7c0 2.4 2.9 4.3 6.5 4.3s6.5-1.9 6.5-4.3v-.7c.3-.4.5-.8.5-1.3zm-10 .8a1.2 1.2 0 112.4 0 1.2 1.2 0 01-2.4 0zm5.6 3.7a.4.4 0 010 .6 4 4 0 01-2.6.8 4 4 0 01-2.6-.8.4.4 0 11.5-.6 3.2 3.2 0 002.1.6 3.2 3.2 0 002.1-.6.4.4 0 01.5 0zm.6-2.5a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4z"/>',
      build: function (p) {
        var u = new URL('https://www.reddit.com/submit');
        u.searchParams.set('url', p.url);
        if (p.title) u.searchParams.set('title', p.title);
        return u.toString();
      },
    },
    hackernews: {
      name: 'Hacker News',
      icon: '<path d="M3 3h18v18H3zm9 11l3-7h-1.5L12 12l-1.5-5H9z"/>',
      build: function (p) {
        var u = new URL('https://news.ycombinator.com/submitlink');
        u.searchParams.set('u', p.url);
        if (p.title) u.searchParams.set('t', p.title);
        return u.toString();
      },
    },
    whatsapp: {
      name: 'WhatsApp',
      icon: '<path d="M17.5 14.4c-.3-.2-1.6-.8-1.9-.9-.3-.1-.5-.2-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6 0-.3-.2-1.2-.4-2.3-1.4-.8-.7-1.4-1.7-1.6-1.9-.2-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.6-1.5c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.2 0 1.3 1 2.6 1.1 2.7.1.2 1.9 2.9 4.7 4 .7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.8-1.3.2-.7.2-1.2.2-1.3-.1-.1-.2-.2-.5-.4zM12 2C6.5 2 2 6.5 2 12c0 1.7.4 3.4 1.3 4.9L2 22l5.3-1.3C8.7 21.6 10.3 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2z"/>',
      build: function (p) {
        var text = (p.text ? p.text + ' ' : '') + p.url;
        return 'https://wa.me/?text=' + encodeURIComponent(text);
      },
    },
    email: {
      name: 'Email',
      icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="22,6 12,13 2,6" fill="none" stroke="currentColor" stroke-width="2"/>',
      iconRaw: true,
      build: function (p) {
        var subject = p.title || '';
        var body = (p.text ? p.text + '\n\n' : '') + p.url;
        return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      },
    },
    copy: {
      name: 'Copy link',
      icon: '<path d="M16 1H4a2 2 0 00-2 2v14h2V3h12zm3 4H8a2 2 0 00-2 2v14a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2zm0 16H8V7h11z" fill="none" stroke="currentColor" stroke-width="2"/>',
      iconRaw: true,
      action: 'copy',
    },
  };

  // -- Build button ---------------------------------------------------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function svgFor(net) {
    var n = NETWORKS[net];
    if (!n) return '';
    if (n.iconRaw) {
      return '<svg viewBox="0 0 24 24" aria-hidden="true">' + n.icon + '</svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + n.icon + '</svg>';
  }

  function payload(el) {
    var url = el.getAttribute('data-aed-share-url') || window.location.href;
    var title = el.getAttribute('data-aed-share-title') || document.title || '';
    var text = el.getAttribute('data-aed-share-text') || '';
    return { url: url, title: title, text: text };
  }

  function buildButton(net, p) {
    var n = NETWORKS[net];
    if (!n) return null;
    var btn;
    if (n.action === 'copy') {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.addEventListener('click', function () { doCopy(btn, p.url); });
    } else {
      btn = document.createElement('a');
      btn.href = n.build(p);
      btn.target = '_blank';
      btn.rel = 'noopener noreferrer';
    }
    btn.className = 'aed-share-btn';
    btn.setAttribute('data-aed-net', net);
    btn.setAttribute('data-aed-tooltip', n.name);
    btn.setAttribute('aria-label', 'Share via ' + n.name);
    btn.innerHTML = svgFor(net) + '<span class="aed-share-btn-text">' + escapeHtml(n.name) + '</span>';
    return btn;
  }

  function doCopy(btn, url) {
    var done = function () {
      btn.classList.add('is-copied');
      var prev = btn.getAttribute('data-aed-tooltip');
      btn.setAttribute('data-aed-tooltip', 'Copied!');
      setTimeout(function () {
        btn.classList.remove('is-copied');
        btn.setAttribute('data-aed-tooltip', prev || 'Copy link');
      }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(done);
    } else {
      // Fallback: hidden textarea
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.left = '-10000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (_) {}
      ta.remove();
    }
  }

  function attach(el) {
    if (el.dataset.aedShareReady === '1') return;
    el.dataset.aedShareReady = '1';

    el.classList.add('aed-share');

    var attr = (el.getAttribute('data-aed-share') || '').trim();
    var nets = attr ? attr.split(',').map(trim).filter(Boolean) : pageDefaults;

    var label = el.getAttribute('data-aed-share-label');
    if (label) {
      var lbl = document.createElement('span');
      lbl.className = 'aed-share-label';
      lbl.textContent = label;
      el.appendChild(lbl);
    }

    var p = payload(el);
    nets.forEach(function (n) {
      var btn = buildButton(n, p);
      if (btn) el.appendChild(btn);
    });
  }

  function boot() {
    document.querySelectorAll('[data-aed-share]').forEach(attach);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.__share = {
    version: VERSION,
    networks: Object.keys(NETWORKS),
    attach: attach,
    url: function (net, p) {
      var n = NETWORKS[net];
      if (!n || n.action === 'copy') return null;
      return n.build(Object.assign({ url: window.location.href, title: document.title, text: '' }, p || {}));
    },
  };
})();
