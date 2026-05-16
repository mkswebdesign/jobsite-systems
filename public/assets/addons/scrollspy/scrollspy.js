/*
 * Scrollspy — drop-in active-link tracker.
 *
 * For every [data-aed-scrollspy] container, walks its `<a href="#id">`
 * children, observes the matching target sections, and toggles
 * `is-active` (or a custom class) on the link whose target is currently
 * in the viewport.
 *
 *   <nav data-aed-scrollspy>
 *     <a href="#intro">Intro</a>
 *     <a href="#features">Features</a>
 *     <a href="#pricing">Pricing</a>
 *   </nav>
 *
 *   <!-- Custom active class -->
 *   <nav data-aed-scrollspy data-aed-scrollspy-class="current">
 *
 *   <!-- Custom rootMargin (controls when activation happens) -->
 *   <nav data-aed-scrollspy data-aed-scrollspy-rootmargin="-20% 0px -65% 0px">
 *
 * Public API:
 *   window.__scrollspy.refresh()           — re-scan all containers
 *   window.__scrollspy.set(container, id)  — manually highlight by id
 *
 * See /scrollspy/README.md.
 */
(function () {
  'use strict';

  var VERSION = '0.1.0';

  function attach(container) {
    if (container.dataset.aedScrollspyReady === '1') return;
    container.dataset.aedScrollspyReady = '1';

    var activeClass = container.getAttribute('data-aed-scrollspy-class') || 'is-active';
    var rootMargin = container.getAttribute('data-aed-scrollspy-rootmargin') || '-15% 0px -65% 0px';

    var links = Array.prototype.slice.call(container.querySelectorAll('a[href^="#"]'));
    if (!links.length) return;

    var idToLink = {};
    var targets = [];
    links.forEach(function (a) {
      var hash = a.getAttribute('href');
      if (!hash || hash.length < 2) return;
      var id = hash.slice(1);
      var t = document.getElementById(id);
      if (!t) return;
      idToLink[id] = a;
      targets.push(t);
    });
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      // Fallback: just highlight first
      idToLink[targets[0].id].classList.add(activeClass);
      return;
    }

    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      });

      // Pick topmost visible
      var pick = null;
      for (var i = 0; i < targets.length; i++) {
        if (visible.has(targets[i].id)) { pick = targets[i].id; break; }
      }
      // Fallback: nearest target above viewport
      if (!pick) {
        var y = window.scrollY + 120;
        for (var j = targets.length - 1; j >= 0; j--) {
          var rect = targets[j].getBoundingClientRect();
          var top = rect.top + window.scrollY;
          if (top <= y) { pick = targets[j].id; break; }
        }
      }

      Object.keys(idToLink).forEach(function (id) {
        idToLink[id].classList.toggle(activeClass, id === pick);
      });
    }, { rootMargin: rootMargin, threshold: 0 });

    targets.forEach(function (t) { io.observe(t); });

    container._aedScrollspy = { idToLink: idToLink, activeClass: activeClass };
  }

  function set(container, id) {
    var data = container && container._aedScrollspy;
    if (!data) return;
    Object.keys(data.idToLink).forEach(function (k) {
      data.idToLink[k].classList.toggle(data.activeClass, k === id);
    });
  }

  function scan() {
    document.querySelectorAll('[data-aed-scrollspy]').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
  }

  window.__scrollspy = {
    version: VERSION,
    refresh: scan,
    set: set,
  };
})();
