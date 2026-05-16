/*
 * Image Lightbox — drop-in click-to-zoom for images.
 *
 * Two opt-in paths:
 *   1) Per-image: <img data-aed-lightbox>
 *      Optional: <img data-aed-lightbox="/large.jpg" data-aed-lightbox-caption="Caption">
 *      Optional grouping: data-aed-lightbox-group="case-study-1"
 *   2) Auto: <meta name="aed:lightbox" content="auto" data-scope="article, .case-study">
 *      Every <img> inside the scope gets opted in, except those with
 *      data-aed-lightbox="off".
 *
 * Keyboard:
 *   Esc        close
 *   Left/Right cycle within the same group (or whole page if no group)
 *
 * Public API:
 *   window.__lightbox.open(imgEl)
 *   window.__lightbox.close()
 *   window.__lightbox.refresh()    — re-scan after dynamic insert
 *
 * See /image-lightbox/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.4.0';

  // -- Config -------------------------------------------------------
  var meta = document.querySelector('meta[name="aed:lightbox"]');
  var autoMode = false;
  var autoScope = 'article, main';
  if (meta) {
    var v = (meta.getAttribute('content') || '').toLowerCase();
    if (v === 'auto' || v === 'all') autoMode = true;
    var s = meta.getAttribute('data-scope');
    if (s) autoScope = s;
  }

  // -- Discovery ---------------------------------------------------
  function discover() {
    var seen = new Set();
    var imgs = [];

    if (autoMode) {
      document.querySelectorAll(autoScope).forEach(function (root) {
        root.querySelectorAll('img').forEach(function (img) {
          if (img.getAttribute('data-aed-lightbox') === 'off') return;
          if (!img.hasAttribute('data-aed-lightbox')) img.setAttribute('data-aed-lightbox', '');
        });
      });
    }

    document.querySelectorAll('img[data-aed-lightbox]').forEach(function (img) {
      if (img.getAttribute('data-aed-lightbox') === 'off') return;
      if (seen.has(img)) return;
      seen.add(img);
      imgs.push(img);
      attach(img);
    });

    return imgs;
  }

  function attach(img) {
    if (img.dataset.aedLightboxReady === '1') return;
    img.dataset.aedLightboxReady = '1';
    img.addEventListener('click', function (e) {
      e.preventDefault();
      open(img);
    });
    // Keyboard accessibility — make focusable + Enter triggers
    if (img.tabIndex < 0) img.tabIndex = 0;
    img.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(img);
      }
    });
  }

  function groupOf(img) {
    return img.getAttribute('data-aed-lightbox-group') || '__page__';
  }

  function siblings(img) {
    var g = groupOf(img);
    return Array.prototype.slice.call(document.querySelectorAll('img[data-aed-lightbox]'))
      .filter(function (i) {
        return i.getAttribute('data-aed-lightbox') !== 'off' && groupOf(i) === g;
      });
  }

  function srcFor(img) {
    var override = img.getAttribute('data-aed-lightbox');
    if (override && override !== '' && override !== 'on' && override !== 'off') return override;
    return img.currentSrc || img.src;
  }

  function captionFor(img) {
    return img.getAttribute('data-aed-lightbox-caption') || '';
  }

  // -- DOM ---------------------------------------------------------
  var scrim = null;
  var stageEl = null;
  var imgEl = null;
  var spinner = null;
  var captionEl = null;
  var counterEl = null;
  var prevBtn = null;
  var nextBtn = null;
  var current = null;
  var group = [];

  // -- Gesture state ----------------------------------------------
  // Single state machine handles single-finger swipe (when scale=1),
  // single-finger pan (when scale>1), two-finger pinch-zoom, and
  // double-tap zoom toggle. The committed zoom/pan view is `view`;
  // gesture-in-progress state lives in `gesture`.
  var SWIPE_THRESHOLD = 40;        // px to commit a prev/next nav
  var DISMISS_THRESHOLD = 100;     // px of downward drag to close the lightbox
  var ZOOM_MIN = 1;
  var ZOOM_MAX = 4;
  var DOUBLE_TAP_MS = 280;
  var DOUBLE_TAP_DIST = 30;
  var DOUBLE_TAP_ZOOM = 2.2;       // scale applied on double-tap to zoom in

  // Committed view — what the image is rendered at when no gesture is active.
  // Reset on open(), step() (next/prev), and pinch-back-to-1.0.
  var view = { scale: 1, x: 0, y: 0 };
  // In-progress gesture state. type ∈ {'swipe', 'pan', 'pinch'} | null.
  var gesture = null;
  // Last single-tap timestamp + position for double-tap detection.
  var lastTap = 0;
  var lastTapPos = { x: 0, y: 0 };

  function build() {
    if (scrim) return;
    scrim = document.createElement('div');
    scrim.className = 'aed-lb-scrim';
    scrim.setAttribute('role', 'dialog');
    scrim.setAttribute('aria-modal', 'true');
    scrim.setAttribute('aria-label', 'Image preview');
    scrim.hidden = true;
    scrim.addEventListener('click', function (e) {
      if (e.target === scrim) close();
    });

    var stage = document.createElement('div');
    stage.className = 'aed-lb-stage';
    stageEl = stage;
    // Swipe nav — single-finger horizontal swipe steps prev/next. Fires on
    // the stage so the user can grip the image OR the surrounding caption /
    // counter area. Touch handlers are passive when possible — only the
    // touchmove preventDefault path is non-passive (gated on a horizontal-
    // dominant drag) so vertical scroll inside the lightbox still works on
    // touch devices.
    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    stage.addEventListener('touchend', onTouchEnd, { passive: true });
    stage.addEventListener('touchcancel', onTouchCancel, { passive: true });

    imgEl = document.createElement('img');
    imgEl.className = 'aed-lb-image';
    imgEl.alt = '';
    imgEl.addEventListener('load', function () {
      imgEl.classList.remove('is-loading');
      if (spinner) spinner.style.display = 'none';
    });
    // Click on the image itself stays on the lightbox — standard modal UX
    // is "click outside to close" only. The scrim handler below catches the
    // backdrop. The image, stage, caption, and counter are all "modal content"
    // and shouldn't dismiss on click. (v0.1.0 closed on image click; that
    // behavior was non-standard and removed in v0.2.0.)
    stage.appendChild(imgEl);

    spinner = document.createElement('div');
    spinner.className = 'aed-lb-spinner';
    stage.appendChild(spinner);

    var meta = document.createElement('div');
    meta.className = 'aed-lb-meta';
    captionEl = document.createElement('span');
    captionEl.className = 'aed-lb-caption';
    counterEl = document.createElement('span');
    counterEl.className = 'aed-lb-counter';
    meta.appendChild(captionEl);
    meta.appendChild(counterEl);
    stage.appendChild(meta);

    scrim.appendChild(stage);

    var close = makeBtn('aed-lb-close', 'Close', '<path d="M6 6l12 12M18 6L6 18"/>');
    close.addEventListener('click', closeLightbox);
    scrim.appendChild(close);

    prevBtn = makeBtn('aed-lb-prev', 'Previous image', '<polyline points="15 18 9 12 15 6"/>');
    prevBtn.addEventListener('click', function () { step(-1); });
    scrim.appendChild(prevBtn);

    nextBtn = makeBtn('aed-lb-next', 'Next image', '<polyline points="9 18 15 12 9 6"/>');
    nextBtn.addEventListener('click', function () { step(1); });
    scrim.appendChild(nextBtn);

    document.body.appendChild(scrim);
  }

  function makeBtn(klass, label, path) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'aed-lb-btn ' + klass;
    b.setAttribute('aria-label', label);
    b.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      path + '</svg>';
    return b;
  }

  // -- Operations --------------------------------------------------
  function open(img) {
    if (!img) return;
    build();
    group = siblings(img);
    current = img;
    paint();
    scrim.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add('is-open'); });
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
  }

  function paint() {
    if (!current) return;
    // Reset zoom state on every paint (open, step). Clearing inline transform
    // styles also lets the CSS `.is-open .aed-lb-image { transform: scale(1) }`
    // entrance animation re-trigger for prev/next steps.
    view = { scale: 1, x: 0, y: 0 };
    gesture = null;
    if (imgEl) {
      imgEl.style.transform = '';
      imgEl.style.transition = '';
      imgEl.style.opacity = '';
    }
    spinner.style.display = '';
    imgEl.classList.add('is-loading');
    imgEl.alt = current.getAttribute('alt') || '';
    imgEl.src = srcFor(current);

    var cap = captionFor(current);
    captionEl.textContent = cap;

    if (group.length > 1) {
      var idx = group.indexOf(current);
      counterEl.textContent = (idx + 1) + ' / ' + group.length;
      prevBtn.hidden = false;
      nextBtn.hidden = false;
    } else {
      counterEl.textContent = '';
      prevBtn.hidden = true;
      nextBtn.hidden = true;
    }

    preloadNeighbors();
  }

  // Prefetch the prev/next siblings' large srcs so swipe / arrow-key nav
  // paints instantly instead of showing the spinner. Browser HTTP cache
  // handles dedupe — re-preloading the same src across paints is free.
  // No-op when group has fewer than 2 images.
  function preloadNeighbors() {
    if (!current || group.length < 2) return;
    var idx = group.indexOf(current);
    if (idx < 0) return;
    var next = group[(idx + 1) % group.length];
    var prev = group[(idx - 1 + group.length) % group.length];
    [next, prev].forEach(function (sibling) {
      if (!sibling || sibling === current) return;
      var src = srcFor(sibling);
      if (!src) return;
      try {
        var pre = new Image();
        pre.decoding = 'async';
        pre.src = src;
      } catch (_) { /* benign */ }
    });
  }

  function step(delta) {
    if (!current || group.length < 2) return;
    var idx = group.indexOf(current);
    var next = group[(idx + delta + group.length) % group.length];
    current = next;
    paint();
  }

  function close() { closeLightbox(); }
  function closeLightbox() {
    if (!scrim) return;
    scrim.classList.remove('is-open');
    setTimeout(function () {
      if (!scrim) return;
      scrim.hidden = true;
      imgEl.removeAttribute('src');
    }, 200);
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }

  // -- View transform ----------------------------------------------
  // Apply current `view` to the image element. `animate` adds a short
  // tween for snap-backs (end of pinch / pan, double-tap toggle); the
  // active gesture path uses animate=false for finger-following.
  function applyView(animate) {
    if (!imgEl) return;
    imgEl.style.transition = animate ? 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
    imgEl.style.transform =
      'translate(' + view.x + 'px, ' + view.y + 'px) scale(' + view.scale + ')';
  }

  // Constrain pan offsets so the user can't drag the image off into empty
  // space when zoomed. Uses an approximation: max-pan = (scale-1) × viewport/2.
  // Imperfect for non-viewport-filling images but predictable and won't lock.
  function clampPan() {
    if (view.scale <= ZOOM_MIN + 0.001) {
      view.x = 0;
      view.y = 0;
      return;
    }
    var maxX = window.innerWidth * (view.scale - 1) / 2;
    var maxY = window.innerHeight * (view.scale - 1) / 2;
    if (view.x < -maxX) view.x = -maxX;
    if (view.x > maxX) view.x = maxX;
    if (view.y < -maxY) view.y = -maxY;
    if (view.y > maxY) view.y = maxY;
  }

  // -- Gesture handlers --------------------------------------------
  // Single state machine. On touchstart, choose a gesture type based on
  // finger count + current zoom state:
  //   1 finger, scale = 1, group > 1 → 'swipe' (prev/next nav)
  //   1 finger, scale > 1            → 'pan'   (drag zoomed image)
  //   2 fingers (any scale)          → 'pinch' (zoom in/out + 2-finger pan)
  // Tap-without-gesture (touchend with no committed gesture) feeds the
  // double-tap detector for zoom-in/zoom-out toggle.
  function onTouchStart(e) {
    if (!current) return;
    var len = e.touches.length;
    if (len === 2) {
      // Pinch start. If a swipe was in progress, abort cleanly first.
      var t1 = e.touches[0];
      var t2 = e.touches[1];
      var dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      var midX = (t1.clientX + t2.clientX) / 2;
      var midY = (t1.clientY + t2.clientY) / 2;
      gesture = {
        type: 'pinch',
        startDist: dist || 1,
        startMidX: midX,
        startMidY: midY,
        baseScale: view.scale,
        baseX: view.x,
        baseY: view.y,
      };
    } else if (len === 1) {
      var t = e.touches[0];
      if (view.scale > ZOOM_MIN + 0.01) {
        // Already zoomed → pan.
        gesture = {
          type: 'pan',
          startX: t.clientX,
          startY: t.clientY,
          baseX: view.x,
          baseY: view.y,
        };
      } else {
        // Not zoomed → unified swipe gesture. Handles three outcomes
        // depending on the dominant axis once movement exceeds the lock
        // threshold: x → prev/next nav (only when group > 1); y (down)
        // → drag-to-dismiss; no movement → tap (feeds double-tap detector).
        gesture = {
          type: 'swipe',
          startX: t.clientX,
          startY: t.clientY,
          lastDx: 0,
          lastDy: 0,
          lockAxis: null,
        };
      }
    }
  }

  function onTouchMove(e) {
    if (!gesture) return;
    if (gesture.type === 'pinch') {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      var t1 = e.touches[0];
      var t2 = e.touches[1];
      var dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      var ratio = dist / gesture.startDist;
      var newScale = gesture.baseScale * ratio;
      if (newScale < ZOOM_MIN) newScale = ZOOM_MIN;
      if (newScale > ZOOM_MAX) newScale = ZOOM_MAX;
      var midX = (t1.clientX + t2.clientX) / 2;
      var midY = (t1.clientY + t2.clientY) / 2;
      view.scale = newScale;
      view.x = gesture.baseX + (midX - gesture.startMidX);
      view.y = gesture.baseY + (midY - gesture.startMidY);
      clampPan();
      applyView(false);
    } else if (gesture.type === 'pan') {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      var t = e.touches[0];
      view.x = gesture.baseX + (t.clientX - gesture.startX);
      view.y = gesture.baseY + (t.clientY - gesture.startY);
      clampPan();
      applyView(false);
    } else if (gesture.type === 'swipe') {
      if (e.touches.length !== 1) return;
      var st = e.touches[0];
      var dx = st.clientX - gesture.startX;
      var dy = st.clientY - gesture.startY;
      if (!gesture.lockAxis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        gesture.lockAxis = (Math.abs(dx) > Math.abs(dy)) ? 'x' : 'y';
      }
      if (gesture.lockAxis === 'x') {
        // Horizontal swipe nav — only previewed when group has siblings.
        if (group.length < 2) return;
        e.preventDefault();
        gesture.lastDx = dx;
        gesture.lastDy = 0;
        if (imgEl) {
          var rx = Math.max(-1, Math.min(1, dx / 200));
          imgEl.style.transition = 'none';
          imgEl.style.transform = 'translateX(' + (dx * 0.5) + 'px) scale(' + (1 - 0.02 * Math.abs(rx)) + ')';
          imgEl.style.opacity = String(Math.max(0.6, 1 - Math.abs(rx) * 0.3));
        }
      } else if (gesture.lockAxis === 'y') {
        // Drag-to-dismiss — only DOWN registers (upward drag passes through
        // as a no-op). Image translates 1:1 with the finger and the scrim
        // fades from full opacity to ~25% so the user feels the lightbox
        // "lifting away" toward the page beneath.
        if (dy <= 0) return;
        e.preventDefault();
        gesture.lastDx = 0;
        gesture.lastDy = dy;
        var p = Math.min(1, dy / 300);
        if (imgEl) {
          imgEl.style.transition = 'none';
          imgEl.style.transform = 'translateY(' + dy + 'px) scale(' + (1 - 0.06 * p) + ')';
          imgEl.style.opacity = String(Math.max(0.55, 1 - 0.45 * p));
        }
        if (scrim) {
          // Override the CSS scrim background with a fading-toward-transparent
          // version. Cleared in onTouchEnd so close()'s opacity transition
          // takes over cleanly.
          scrim.style.background = 'rgba(8, 8, 12, ' + (0.92 - 0.7 * p) + ')';
        }
      }
    }
  }

  function onTouchEnd(e) {
    if (!gesture) return;
    var g = gesture;
    gesture = null;
    if (g.type === 'pinch') {
      // If pinch dragged scale below minimum threshold, snap fully back to
      // identity so click handlers and swipe nav re-engage cleanly.
      if (view.scale <= ZOOM_MIN + 0.05) {
        view.scale = ZOOM_MIN;
        view.x = 0;
        view.y = 0;
        applyView(true);
      } else {
        applyView(true);
      }
    } else if (g.type === 'pan') {
      applyView(true);
    } else if (g.type === 'swipe') {
      var dx = g.lastDx;
      var dy = g.lastDy;
      var lockX = g.lockAxis === 'x';
      var lockY = g.lockAxis === 'y';
      // Reset inline styles before close()/step()/tryDoubleTap so the next
      // paint or fade-out animation starts from a clean slate.
      if (imgEl) {
        imgEl.style.transition = '';
        imgEl.style.transform = '';
        imgEl.style.opacity = '';
      }
      if (scrim) {
        scrim.style.background = '';
      }
      if (lockX && Math.abs(dx) > SWIPE_THRESHOLD && group.length > 1) {
        step(dx < 0 ? 1 : -1);
        return;
      }
      if (lockY && dy > DISMISS_THRESHOLD) {
        close();
        return;
      }
      // Tap-without-movement — feed double-tap detector. Both no-lock and
      // small-movement-then-released paths land here.
      if (!g.lockAxis) tryDoubleTap(g.startX, g.startY);
    }
  }

  function onTouchCancel() {
    gesture = null;
    if (imgEl) {
      imgEl.style.opacity = '';
      // Restore committed view so a cancelled pan/pinch/dismiss-drag doesn't
      // leave the image stuck mid-gesture.
      applyView(false);
    }
    if (scrim) {
      scrim.style.background = '';
    }
  }

  // -- Double-tap zoom toggle -------------------------------------
  // Two taps within DOUBLE_TAP_MS and DOUBLE_TAP_DIST of each other toggle
  // between scale=1 and DOUBLE_TAP_ZOOM. Zoom-in centers on the tap point
  // (so the user "zooms toward" what they tapped); zoom-out resets to 0,0.
  function tryDoubleTap(tx, ty) {
    var now = Date.now();
    if (now - lastTap < DOUBLE_TAP_MS &&
        Math.abs(tx - lastTapPos.x) < DOUBLE_TAP_DIST &&
        Math.abs(ty - lastTapPos.y) < DOUBLE_TAP_DIST) {
      // Double-tap.
      if (view.scale > ZOOM_MIN + 0.01) {
        // Reset to fit.
        view = { scale: 1, x: 0, y: 0 };
      } else {
        // Zoom in toward tap point.
        var rect = imgEl.getBoundingClientRect();
        var imgCx = rect.left + rect.width / 2;
        var imgCy = rect.top + rect.height / 2;
        // Translate so the tapped point ends up at viewport center after
        // scaling: new offset ≈ (imgCenter - tapPoint) × scale.
        view.scale = DOUBLE_TAP_ZOOM;
        view.x = (imgCx - tx) * (DOUBLE_TAP_ZOOM - 1);
        view.y = (imgCy - ty) * (DOUBLE_TAP_ZOOM - 1);
        clampPan();
      }
      applyView(true);
      lastTap = 0;
      lastTapPos = { x: 0, y: 0 };
    } else {
      lastTap = now;
      lastTapPos = { x: tx, y: ty };
    }
  }

  // -- Boot --------------------------------------------------------
  function boot() { discover(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.__lightbox = {
    version: VERSION,
    open: open,
    close: close,
    refresh: discover,
  };
})();
