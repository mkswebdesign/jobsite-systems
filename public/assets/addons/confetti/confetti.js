/*
 * Confetti — drop-in canvas burst.
 *
 * Programmatic API: window.__confetti.fire({ ... }). Pure canvas, no
 * dependencies, no library bundle. Brand-aware: pulls --accent from
 * the CSS theme to seed default colors.
 *
 * Optional auto-bridge to /forms/ (opt-in):
 *   <meta name="aed:confetti" content="on" data-bridge="form">
 *
 * Public API:
 *   window.__confetti.fire({
 *     origin: { x: 0.5, y: 0.7 },     // 0–1 normalized to viewport
 *     particleCount: 80,
 *     spread: 70,                      // degrees
 *     angle: 90,                       // degrees, 90 = straight up
 *     startVelocity: 32,
 *     decay: 0.94,
 *     gravity: 1,
 *     ticks: 200,
 *     scalar: 1,                       // overall size multiplier
 *     colors: ['#6B00FF', '#fff', '#10b981']
 *   })
 *   window.__confetti.cannon()        // burst from both lower corners (party mode)
 *
 * See /confetti/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  var meta = document.querySelector('meta[name="aed:confetti"]');
  var enabled = true;
  var bridges = [];
  if (meta) {
    var v = (meta.getAttribute('content') || '').toLowerCase();
    enabled = v === 'on' || v === 'true' || v === '1' || v === '';
    bridges = (meta.getAttribute('data-bridge') || '')
      .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }
  if (!enabled) return;

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // -- Brand colors ----------------------------------------------------
  function brandColors() {
    var styles = getComputedStyle(document.documentElement);
    var accent = (styles.getPropertyValue('--accent') || '').trim() || '#6B00FF';
    var hover  = (styles.getPropertyValue('--accent-hover') || '').trim() || accent;
    return [accent, hover, '#ffffff', '#fef08a', '#10b981', '#f97316'];
  }

  // -- Canvas (lazy, single, persistent) ------------------------------
  var canvas = null, ctx = null, dpr = 1;
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'aed-confetti-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize, { passive: true });
  }
  function resize() {
    if (!canvas) return;
    dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // -- Particle pool --------------------------------------------------
  var particles = [];
  var running = false;

  function makeParticle(opts) {
    var w = window.innerWidth, h = window.innerHeight;
    var origin = opts.origin || { x: 0.5, y: 0.7 };
    var ox = origin.x * w, oy = origin.y * h;

    var spread = opts.spread || 70;
    var angle = (opts.angle == null ? 90 : opts.angle);
    var theta = (angle - 90 + (Math.random() - 0.5) * spread) * Math.PI / 180;

    var v = (opts.startVelocity || 32) * (0.7 + Math.random() * 0.6);
    var scalar = opts.scalar || 1;

    var colors = opts.colors || brandColors();
    var color = colors[Math.floor(Math.random() * colors.length)];

    return {
      x: ox,
      y: oy,
      vx: Math.cos(theta) * v,
      vy: -Math.abs(Math.sin(theta) * v) - Math.random() * 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 14,
      tilt: Math.random() * Math.PI,
      tiltSpeed: 0.08 + Math.random() * 0.12,
      decay: opts.decay || 0.94,
      gravity: (opts.gravity == null ? 1 : opts.gravity) * 0.18,
      ticks: opts.ticks || 200,
      tick: 0,
      color: color,
      size: (5 + Math.random() * 4) * scalar,
      shape: Math.random() < 0.7 ? 'rect' : 'circle',
    };
  }

  function step() {
    if (!ctx) return;
    var w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    var alive = 0;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.tick >= p.ticks) continue;
      p.tick += 1;
      p.vx *= p.decay;
      p.vy *= p.decay;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.tilt += p.tiltSpeed;

      if (p.y > h + 60 || p.x < -60 || p.x > w + 60) continue;

      var alpha = 1 - p.tick / p.ticks;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.scale(Math.cos(p.tilt), 1);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size * 0.4, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      alive += 1;
    }

    if (alive > 0) {
      requestAnimationFrame(step);
    } else {
      particles = [];
      running = false;
      ctx.clearRect(0, 0, w, h);
    }
  }

  function fire(opts) {
    opts = opts || {};
    if (REDUCED) return; // silent no-op on reduced-motion

    ensureCanvas();
    var count = opts.particleCount == null ? 80 : opts.particleCount;
    for (var i = 0; i < count; i++) {
      particles.push(makeParticle(opts));
    }
    if (!running) {
      running = true;
      requestAnimationFrame(step);
    }
  }

  function cannon() {
    fire({ origin: { x: 0.1, y: 0.85 }, angle: 60, particleCount: 60, spread: 55 });
    fire({ origin: { x: 0.9, y: 0.85 }, angle: 120, particleCount: 60, spread: 55 });
  }

  // -- Bridges --------------------------------------------------------
  if (bridges.indexOf('form') > -1) {
    document.addEventListener('aed:form:success', function () {
      fire();
    });
  }

  window.__confetti = {
    version: VERSION,
    fire: fire,
    cannon: cannon,
  };
})();
