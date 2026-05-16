/**
 * Theme — portable dark / light / vibrant runtime
 * -----------------------------------------------
 * Wires the optional #themeToggle segmented control, listens for
 * system-preference changes until the user makes an explicit
 * choice, and applies a brief `html.theme-transitioning` class on
 * every swap so CSS can cross-fade surface colors smoothly.
 *
 * Contract:
 *   • The <html> element must already carry data-theme in
 *     {"dark","light","vibrant"} before this script runs. Use the
 *     pre-paint inline snippet from Base.astro / README to set it
 *     before first paint.
 *   • A container with id="themeToggle" is optional. When present
 *     it should hold three <button class="theme-opt" data-mode="…">
 *     children, one per mode. Clicks switch directly to the picked
 *     mode (no cycling), because the three options are always
 *     visible as a segmented control.
 *   • The companion theme.css styles .theme-toggle + .theme-opt +
 *     the sliding thumb (positioned via a --thumb-index var).
 */
(function () {
  var STORAGE_KEY = 'theme';
  var LEGACY_INVERTED_KEY = 'themeInverted';
  var TRANSITION_CLASS = 'theme-transitioning';
  var TRANSITION_DURATION = 400;
  var MODES = ['dark', 'light', 'vibrant'];
  var html = document.documentElement;

  function isMode(v) { return v === 'dark' || v === 'light' || v === 'vibrant'; }
  function getTheme() {
    var t = html.getAttribute('data-theme');
    return isMode(t) ? t : 'vibrant';
  }

  // One-time migration for visitors who had the old dark/light +
  // invert toggle. The closest equivalent of "authored rhythm" was
  // `data-theme-inverted` on — treat that as the new "vibrant" mode
  // so returning visitors don't lose their preference. Everything
  // else (pure dark/light saved) carries over unchanged.
  try {
    var legacy = localStorage.getItem(LEGACY_INVERTED_KEY);
    if (legacy != null) {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (legacy === '1' && (stored === 'dark' || stored === 'light' || stored == null)) {
        localStorage.setItem(STORAGE_KEY, 'vibrant');
      }
      localStorage.removeItem(LEGACY_INVERTED_KEY);
    }
    // Clean up the stale attribute if the old pre-paint set it.
    if (html.hasAttribute('data-theme-inverted')) html.removeAttribute('data-theme-inverted');
  } catch (_) {}

  var MODE_LABELS = { dark: 'Dark', light: 'Bright', vibrant: 'Vibrant' };
  var toastEl = null;
  var toastTimer = null;

  function ensureToast() {
    if (toastEl) return toastEl;
    toastEl = document.createElement('div');
    toastEl.className = 'theme-toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    toastEl.setAttribute('aria-atomic', 'true');
    // Portal to <body> with position:fixed so no ancestor's overflow,
    // stacking context (isolation:isolate on the pill), or z-index can
    // clip or underlap us. Position is recomputed per show() from the
    // toggle's bounding rect.
    document.body.appendChild(toastEl);
    return toastEl;
  }

  function positionToast(el) {
    var r = toggle && toggle.getBoundingClientRect();
    var visible = r && (r.width > 0 || r.height > 0);
    if (!visible) {
      // No toggle on this page, or it's inside a closed drawer — the
      // editor's Theme modal still calls showToast() so the user gets
      // confirmation. Fall back to a top-center viewport pin so the
      // toast doesn't land off-screen at (0,0).
      el.classList.remove('theme-toast--above');
      el.style.top = '24px';
      el.style.bottom = '';
      el.style.left = (window.innerWidth / 2) + 'px';
      el.style.setProperty('--notch-offset', '0px');
      return;
    }
    var centerX = r.left + r.width / 2;
    // Default: hang below the toggle. If the toggle sits in the lower
    // half of the viewport (e.g. bottom-dock nav variant F), flip above.
    var below = r.top + r.height / 2 < window.innerHeight / 2;
    el.classList.toggle('theme-toast--above', !below);
    if (below) {
      el.style.top = (r.bottom + 10) + 'px';
      el.style.bottom = '';
    } else {
      el.style.bottom = (window.innerHeight - r.top + 10) + 'px';
      el.style.top = '';
    }
    // Clamp horizontally to the viewport so narrow mobile (drawer near
    // right edge) doesn't push the toast off-screen. The toast uses a
    // translate(-50%) transform, so the effective rendered center sits
    // at `left`. Measure the toast's own width (already populated with
    // the final text by the caller) and keep an 8px safe margin on each
    // side. The notch slides via --notch-offset to keep pointing at the
    // real toggle center even when the toast is clamped away from it.
    var halfW = el.offsetWidth / 2 || 60;
    var viewportW = window.innerWidth;
    var SAFE = 8;
    var minLeft = halfW + SAFE;
    var maxLeft = viewportW - halfW - SAFE;
    var clampedX = minLeft > maxLeft ? viewportW / 2 : Math.min(maxLeft, Math.max(minLeft, centerX));
    el.style.left = clampedX + 'px';
    el.style.setProperty('--notch-offset', (centerX - clampedX) + 'px');
  }

  function showToast(mode) {
    var el = ensureToast();
    if (!el) return;
    var label = MODE_LABELS[mode] || mode;
    el.textContent = label + ' mode';
    el.setAttribute('data-mode', mode);
    positionToast(el);
    // Force a reflow before flipping the visible class so the
    // enter-transition runs even when the toast was just mounted.
    void el.offsetWidth;
    el.classList.add('is-visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('is-visible');
    }, 1600);
  }

  function applyMode(mode, persist, announce) {
    if (!isMode(mode)) return;
    // theme-transitioning applies a `* { transition: bg, color, border, shadow }`
    // cascade to every element on the page so the swap fades smoothly. That works
    // fine when the page is at rest, but when the mobile drawer is open the swap
    // happens WHILE the drawer is computing its own backdrop / overlay paint —
    // the universal cascade contends with it and the elements behind the drawer
    // visibly flicker as paint/composite steps interleave. Snap the swap instead
    // when the drawer is open: the user is focused on the drawer, the page
    // behind isn't in their visual field, and the drawer chrome itself reads
    // cleaner with an instant flip than a contested 400ms cross-fade.
    var drawerOpen = !!document.querySelector('.nav-links.open');
    if (!drawerOpen) {
      html.classList.add(TRANSITION_CLASS);
      setTimeout(function () { html.classList.remove(TRANSITION_CLASS); }, TRANSITION_DURATION);
    }
    html.setAttribute('data-theme', mode);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}
    }
    syncToggle();
    if (announce) showToast(mode);
  }

  var toggle = document.getElementById('themeToggle');
  var opts = toggle ? toggle.querySelectorAll('.theme-opt') : [];

  function syncToggle() {
    if (!toggle) return;
    var current = getTheme();
    var idx = 0;
    for (var i = 0; i < opts.length; i++) {
      var btn = opts[i];
      var mode = btn.getAttribute('data-mode');
      var active = mode === current;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
      btn.setAttribute('tabindex', active ? '0' : '-1');
      if (active) idx = i;
    }
    toggle.style.setProperty('--thumb-index', idx);
    toggle.style.setProperty('--thumb-count', opts.length || MODES.length);
  }

  if (toggle) {
    syncToggle();
    for (var i = 0; i < opts.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var mode = btn.getAttribute('data-mode');
          if (!isMode(mode)) return;
          if (mode === getTheme()) return;
          applyMode(mode, true, true);
        });
        // Arrow-key navigation inside the radiogroup.
        btn.addEventListener('keydown', function (e) {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          e.preventDefault();
          var cur = -1;
          for (var j = 0; j < opts.length; j++) if (opts[j] === btn) { cur = j; break; }
          if (cur < 0) return;
          var next = e.key === 'ArrowRight' ? (cur + 1) % opts.length : (cur - 1 + opts.length) % opts.length;
          var mode = opts[next].getAttribute('data-mode');
          if (isMode(mode)) {
            applyMode(mode, true, true);
            opts[next].focus();
          }
        });
      })(opts[i]);
    }
  }

  // Track system preference until the user makes an explicit choice.
  // Only meaningful for dark ↔ light — vibrant is an authored mode
  // the user opts into, never inferred from the OS.
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onSystemChange = function (e) {
      var saved;
      try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) {}
      if (isMode(saved)) return;
      applyMode(e.matches ? 'light' : 'dark', false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  // Expose a minimal visual API so the in-page editor (edit.js) can
  // reuse the same toggle-sync + confirmation-toast the header pill
  // uses — otherwise picking a mode from the Theme modal silently
  // flips data-theme and leaves the nav pill's sliding thumb stale.
  window.__arichTheme = {
    showToast: showToast,
    syncToggle: syncToggle,
    getMode: getTheme
  };
})();
