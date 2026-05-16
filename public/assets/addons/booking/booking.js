/*
 * Booking — drop-in calendar embed.
 *
 * Provider URLs are built from a `<provider>:<path>` token. Three
 * providers shipped: cal (Cal.com), calendly, savvycal. Iframe-based —
 * no third-party JS required.
 *
 * Configure once per page / layout:
 *   <meta name="aed:booking" content="cal:anthonyrichter/15min">
 *
 * Trigger a modal:
 *   <button data-aed-booking-trigger>Book a call</button>
 *   <button data-aed-booking-trigger="cal:anthony/30min">Longer slot</button>
 *
 * Inline embed:
 *   <div data-aed-booking-inline></div>
 *   <div data-aed-booking-inline="calendly:anthony/intro" style="height:720px"></div>
 *
 * Public API:
 *   window.__booking.open(target?)   — open modal (uses default if no target)
 *   window.__booking.close()
 *   window.__booking.parse(token)    — { provider, path, url }
 *
 * See /booking/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  // -- Provider URL builders --------------------------------------------
  var PROVIDERS = {
    cal: function (path, opts) {
      var clean = path.replace(/^\/+|\/+$/g, '');
      var url = 'https://cal.com/' + clean;
      var qs = ['embed=true'];
      if (opts.theme) qs.push('theme=' + encodeURIComponent(opts.theme));
      return url + (url.indexOf('?') > -1 ? '&' : '?') + qs.join('&');
    },
    calendly: function (path, opts) {
      var clean = path.replace(/^\/+|\/+$/g, '');
      var url = 'https://calendly.com/' + clean;
      var qs = ['embed_domain=' + encodeURIComponent(window.location.hostname),
                'embed_type=Inline',
                'hide_landing_page_details=1',
                'hide_gdpr_banner=1'];
      return url + (url.indexOf('?') > -1 ? '&' : '?') + qs.join('&');
    },
    savvycal: function (path) {
      var clean = path.replace(/^\/+|\/+$/g, '');
      return 'https://savvycal.com/' + clean + '/embed';
    },
  };

  function parseToken(token) {
    if (!token) return null;
    var m = String(token).match(/^([a-z]+):(.+)$/i);
    if (!m) return null;
    var provider = m[1].toLowerCase();
    var path = m[2];
    var build = PROVIDERS[provider];
    if (!build) return null;
    var theme = (document.documentElement.getAttribute('data-theme') === 'light') ? 'light' : 'dark';
    return { provider: provider, path: path, url: build(path, { theme: theme }) };
  }

  // -- Default token from page meta -------------------------------------
  var defaultToken = (function () {
    var meta = document.querySelector('meta[name="aed:booking"]');
    return meta ? meta.getAttribute('content') : null;
  })();

  // -- Modal ------------------------------------------------------------
  var scrim = null;

  function buildModal() {
    if (scrim) return scrim;
    scrim = document.createElement('div');
    scrim.className = 'aed-booking-scrim';
    scrim.hidden = true;
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });

    var modal = document.createElement('div');
    modal.className = 'aed-booking-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Book a time');

    var header = document.createElement('div');
    header.className = 'aed-booking-modal-header';
    var title = document.createElement('p');
    title.className = 'aed-booking-modal-title';
    title.textContent = 'Pick a time';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'aed-booking-modal-close';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg>';
    close.addEventListener('click', closeModal);
    header.appendChild(title);
    header.appendChild(close);
    modal.appendChild(header);

    var body = document.createElement('div');
    body.className = 'aed-booking-modal-body';
    modal.appendChild(body);

    scrim.appendChild(modal);
    document.body.appendChild(scrim);
    return scrim;
  }

  function open(target) {
    var token = target || defaultToken;
    var parsed = parseToken(token);
    if (!parsed) {
      console.warn('[aed:booking] no valid provider token (got "' + token + '")');
      return;
    }
    buildModal();
    var body = scrim.querySelector('.aed-booking-modal-body');
    body.innerHTML = '';
    var iframe = document.createElement('iframe');
    iframe.src = parsed.url;
    iframe.allow = 'camera; microphone; autoplay; encrypted-media; fullscreen; payment';
    iframe.title = 'Booking calendar (' + parsed.provider + ')';
    body.appendChild(iframe);

    scrim.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add('is-open'); });
    document.addEventListener('keydown', escClose);
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!scrim) return;
    scrim.classList.remove('is-open');
    setTimeout(function () {
      if (!scrim) return;
      scrim.hidden = true;
      var body = scrim.querySelector('.aed-booking-modal-body');
      if (body) body.innerHTML = ''; // unload iframe to stop video/audio
    }, 220);
    document.removeEventListener('keydown', escClose);
    document.body.style.overflow = '';
  }
  var close = closeModal;
  function escClose(e) { if (e.key === 'Escape') closeModal(); }

  // -- Inline embeds ----------------------------------------------------
  function mountInline(el) {
    if (el.dataset.aedBookingReady === '1') return;
    el.dataset.aedBookingReady = '1';

    var token = el.getAttribute('data-aed-booking-inline') || defaultToken;
    var parsed = parseToken(token);
    if (!parsed) {
      console.warn('[aed:booking] inline embed missing valid token');
      return;
    }

    el.classList.add('aed-booking-inline');

    var loader = document.createElement('div');
    loader.className = 'aed-booking-inline-loading';
    loader.innerHTML = '<span class="aed-booking-spinner" aria-hidden="true"></span><span>Loading calendar…</span>';
    el.appendChild(loader);

    // Lazy-mount when in viewport (saves data on long pages)
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.disconnect();
        loadInline(el, parsed);
      });
    }, { rootMargin: '200px' }) : null;

    if (io) io.observe(el);
    else loadInline(el, parsed);
  }

  function loadInline(el, parsed) {
    var iframe = document.createElement('iframe');
    iframe.src = parsed.url;
    iframe.title = 'Booking calendar (' + parsed.provider + ')';
    iframe.allow = 'camera; microphone; autoplay; encrypted-media; fullscreen; payment';
    iframe.addEventListener('load', function () { el.classList.add('is-loaded'); });
    el.appendChild(iframe);
  }

  // -- Wire triggers -----------------------------------------------------
  function attach(el) {
    if (el.dataset.aedBookingReady === '1') return;
    el.dataset.aedBookingReady = '1';
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var token = el.getAttribute('data-aed-booking-trigger');
      // Empty attribute → use default; explicit value → use that
      open(token || undefined);
    });
  }

  function boot() {
    document.querySelectorAll('[data-aed-booking-trigger]').forEach(attach);
    document.querySelectorAll('[data-aed-booking-inline]').forEach(mountInline);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.__booking = {
    version: VERSION,
    open: open,
    close: closeModal,
    parse: parseToken,
    attach: attach,
    mountInline: mountInline,
  };
})();
