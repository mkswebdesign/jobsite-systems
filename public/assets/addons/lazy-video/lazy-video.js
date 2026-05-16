/*
 * Lazy Video — drop-in lazy <video> + facade for YouTube/Vimeo.
 *
 *  Native:  <video data-aed-lazy poster="/p.jpg" controls>
 *             <source data-src="/v.mp4" type="video/mp4">
 *           </video>
 *
 *  YouTube: <div data-aed-video="youtube:dQw4w9WgXcQ"
 *                data-aed-video-title="Optional title"></div>
 *
 *  Vimeo:   <div data-aed-video="vimeo:123456789"
 *                data-aed-video-poster="/poster.jpg"></div>
 *
 *  Custom:  <div data-aed-video="custom:https://embed.url/"
 *                data-aed-video-poster="/poster.jpg"></div>
 *
 * YouTube embeds use https://www.youtube-nocookie.com — no cookies set
 * unless the user clicks Play and the iframe loads.
 *
 * Public API:
 *   window.__lazyVideo.refresh()    — re-scan after dynamic insert
 *   window.__lazyVideo.play(el)     — programmatically expand a facade
 *
 * See /lazy-video/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  // -- Native <video> lazy-load ---------------------------------------
  function attachNativeVideo(v) {
    if (v.dataset.aedLazyReady === '1') return;
    v.dataset.aedLazyReady = '1';
    v.preload = 'none';

    var sources = v.querySelectorAll('source[data-src]');
    if (!sources.length && !v.getAttribute('data-src')) return;

    var loaded = false;
    function load() {
      if (loaded) return;
      loaded = true;
      sources.forEach(function (s) {
        s.src = s.getAttribute('data-src');
        s.removeAttribute('data-src');
      });
      var direct = v.getAttribute('data-src');
      if (direct) {
        v.src = direct;
        v.removeAttribute('data-src');
      }
      v.load();
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.disconnect();
          load();
        });
      }, { rootMargin: '300px' });
      io.observe(v);
    } else {
      load();
    }
  }

  // -- Iframe facade --------------------------------------------------
  var PLAY_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M8 5v14l11-7z"/></svg>';

  function parseToken(token) {
    if (!token) return null;
    var m = String(token).match(/^([a-z]+):(.+)$/i);
    if (!m) return null;
    return { provider: m[1].toLowerCase(), id: m[2].trim() };
  }

  function embedUrl(provider, id, opts) {
    if (provider === 'youtube') {
      // youtube-nocookie + autoplay on click
      var params = ['autoplay=1', 'rel=0'];
      if (opts.start) params.push('start=' + encodeURIComponent(opts.start));
      return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?' + params.join('&');
    }
    if (provider === 'vimeo') {
      return 'https://player.vimeo.com/video/' + encodeURIComponent(id) + '?autoplay=1&dnt=1';
    }
    if (provider === 'custom') {
      // id is the full embed URL
      return id;
    }
    return null;
  }

  function defaultPoster(provider, id) {
    if (provider === 'youtube') {
      // maxres → hq fallback handled via onerror
      return 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/maxresdefault.jpg';
    }
    return null; // Vimeo / custom must provide
  }
  function fallbackPoster(provider, id) {
    if (provider === 'youtube') {
      return 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg';
    }
    return null;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function attachFacade(el) {
    if (el.dataset.aedVideoReady === '1') return;
    el.dataset.aedVideoReady = '1';

    var token = el.getAttribute('data-aed-video');
    var parsed = parseToken(token);
    if (!parsed) {
      console.warn('[aed:video] invalid token', token);
      return;
    }

    var customPoster = el.getAttribute('data-aed-video-poster');
    var poster = customPoster || defaultPoster(parsed.provider, parsed.id);
    var title = el.getAttribute('data-aed-video-title') || '';
    var providerLabel = parsed.provider === 'youtube' ? 'YouTube'
                      : parsed.provider === 'vimeo' ? 'Vimeo'
                      : '';

    el.classList.add('aed-video');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', 'Play video' + (title ? ': ' + title : ''));

    var posterImg = poster
      ? '<img class="aed-video-poster" src="' + escapeHtml(poster) + '" alt="" loading="lazy"' +
        (parsed.provider === 'youtube'
          ? ' onerror="this.onerror=null;this.src=\'' + escapeHtml(fallbackPoster('youtube', parsed.id)) + '\'"'
          : '') +
        '>'
      : '';

    el.innerHTML =
      posterImg +
      (providerLabel ? '<span class="aed-video-provider">' + providerLabel + '</span>' : '') +
      (title ? '<span class="aed-video-title">' + escapeHtml(title) + '</span>' : '') +
      '<button type="button" class="aed-video-play" aria-label="Play video" tabindex="-1">' + PLAY_SVG + '</button>';

    function activate() {
      var url = embedUrl(parsed.provider, parsed.id, { start: el.getAttribute('data-aed-video-start') });
      if (!url) return;
      var iframe = document.createElement('iframe');
      iframe.className = 'aed-video-iframe';
      iframe.src = url;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.title = title || (providerLabel + ' video');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      el.appendChild(iframe);
      el.classList.add('is-loaded');
    }

    el.addEventListener('click', activate);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });

    el._aedActivate = activate;
  }

  // -- Discovery ---------------------------------------------------
  function scan() {
    document.querySelectorAll('video[data-aed-lazy]').forEach(attachNativeVideo);
    document.querySelectorAll('[data-aed-video]').forEach(attachFacade);
  }

  function boot() { scan(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.__lazyVideo = {
    version: VERSION,
    refresh: scan,
    play: function (el) { if (el && typeof el._aedActivate === 'function') el._aedActivate(); },
  };
})();
