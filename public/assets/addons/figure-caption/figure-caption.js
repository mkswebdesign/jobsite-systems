/*
 * Figure Caption — drop-in <img data-caption> → <figure><figcaption>.
 *
 * Wraps any <img data-caption="..."> in a proper semantic <figure>
 * element with a <figcaption> derived from the data attribute. Keeps
 * everything else on the image (alt, src, classes, data-aed-lightbox)
 * intact so other addons still see it.
 *
 *   <img src="/work/before.jpg" alt="Before redesign"
 *        data-caption="Before — the inherited site at the start of week one">
 *
 *   <!-- Variants: default | side | quote -->
 *   <img src="/x.jpg" alt="X" data-caption="..." data-aed-fig-variant="quote">
 *
 *   <!-- Auto-mode: wrap every <img alt> inside a configured scope -->
 *   <meta name="aed:figure-caption" content="auto" data-scope=".case-study">
 *   In auto mode, an <img> with `alt` but no `data-caption` uses its
 *   alt as the caption. Skip with data-aed-fig-skip on the image.
 *
 * Public API:
 *   window.__figure.refresh()
 *   window.__figure.wrap(img)
 *
 * See /figure-caption/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var meta = document.querySelector('meta[name="aed:figure-caption"]');
  var autoMode = false;
  var autoScope = 'article, main';
  if (meta) {
    var v = (meta.getAttribute('content') || '').toLowerCase();
    if (v === 'auto') autoMode = true;
    var s = meta.getAttribute('data-scope');
    if (s) autoScope = s;
  }

  function wrap(img) {
    if (img.dataset.aedFigReady === '1') return;
    if (img.hasAttribute('data-aed-fig-skip')) return;

    var explicit = img.getAttribute('data-caption');
    var caption = explicit;
    if (!caption && autoMode) caption = img.getAttribute('alt') || '';
    if (!caption) return;

    img.dataset.aedFigReady = '1';

    // Already inside a <figure>? Just stamp the marker + add caption if missing.
    var existingFig = img.closest('figure');
    if (existingFig) {
      existingFig.setAttribute('data-aed-fig', '');
      var variant = img.getAttribute('data-aed-fig-variant');
      if (variant) existingFig.setAttribute('data-aed-fig-variant', variant);
      if (!existingFig.querySelector('figcaption')) {
        var fc = document.createElement('figcaption');
        fc.textContent = caption;
        existingFig.appendChild(fc);
      }
      return;
    }

    var figure = document.createElement('figure');
    figure.setAttribute('data-aed-fig', '');
    var variant = img.getAttribute('data-aed-fig-variant');
    if (variant) figure.setAttribute('data-aed-fig-variant', variant);

    var fc = document.createElement('figcaption');
    fc.textContent = caption;

    img.parentNode.insertBefore(figure, img);
    figure.appendChild(img);
    figure.appendChild(fc);
  }

  function scan() {
    // Explicit: any <img data-caption>
    document.querySelectorAll('img[data-caption]').forEach(wrap);
    // Auto: every <img alt> inside scope
    if (autoMode) {
      var roots = document.querySelectorAll(autoScope);
      roots.forEach(function (r) {
        r.querySelectorAll('img[alt]').forEach(function (img) {
          if (!img.getAttribute('alt').trim()) return;
          wrap(img);
        });
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__figure = {
    version: VERSION,
    refresh: scan,
    wrap: wrap,
  };
})();
