/* ============================================
   Shared JavaScript
   Nav, scroll reveal, page transitions, FAQ, skills carousel
   ============================================ */
(function() {
  'use strict';

  // ---- Nav scroll effect ----
  // Class selector first so pages without id="nav" still get the scroll effect.
  var nav = document.querySelector('nav.nav') || document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', function() {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  }

  // ---- Mobile menu toggle ----
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  var navOverlay = document.getElementById('navOverlay');

  function openMenu() {
    if (!navLinks) return;
    navLinks.classList.add('open');
    if (navOverlay) navOverlay.classList.add('active');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (!navLinks) return;
    navLinks.classList.remove('open');
    if (navOverlay) navOverlay.classList.remove('active');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function() {
      navLinks.classList.contains('open') ? closeMenu() : openMenu();
    });
    if (navOverlay) navOverlay.addEventListener('click', closeMenu);
    navLinks.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) closeMenu();
    });
  }

  // ---- Scroll reveal ----
  var revealSelectors = '.reveal, .reveal-fade, .reveal-scale, .reveal-left, .reveal-right, .reveal-rotate, .slide-reveal-left, .slide-reveal-right, .scale-reveal, .flip-reveal, .blur-reveal, .icon-pop, .line-draw, .count-up, .stagger-container';
  var revealElements = document.querySelectorAll(revealSelectors);

  if (revealElements.length > 0) {
    // Fail-open: if IntersectionObserver is unavailable (or errors), show content immediately.
    if (!('IntersectionObserver' in window)) {
      revealElements.forEach(function(el) { el.classList.add('revealed'); });
    } else {
      try {
        var revealObserver = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) {
              var delay = entry.target.dataset.revealDelay || 0;
              if (delay > 0) {
                setTimeout(function() { entry.target.classList.add('revealed'); }, delay);
              } else {
                entry.target.classList.add('revealed');
              }
              revealObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        revealElements.forEach(function(el) { revealObserver.observe(el); });
      } catch (_) {
        revealElements.forEach(function(el) { el.classList.add('revealed'); });
      }
    }
  }

  // ---- Page transitions ----
  window.addEventListener('load', function() {
    var overlay = document.getElementById('pageTransition');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(function() { overlay.style.display = 'none'; }, 500);
    }
  });

  document.querySelectorAll('a[href]:not([href^="#"]):not([href^="mailto:"]):not([href^="tel:"]):not([target="_blank"])').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var href = link.getAttribute('href');
      if (href && !href.startsWith('#')) {
        e.preventDefault();
        var overlay = document.getElementById('pageTransition');
        if (overlay) {
          overlay.style.display = 'block';
          overlay.classList.remove('fade-out');
          overlay.classList.add('fade-in');
          setTimeout(function() { window.location.href = href; }, 400);
        } else {
          window.location.href = href;
        }
      }
    });
  });

  // ---- Smooth scroll for anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var targetId = link.getAttribute('href').slice(1);
      var target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        var navHeight = nav ? nav.offsetHeight : 0;
        var top = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  // ---- FAQ accordion ----
  // Delegated listener survives items added after load; guards against double-bind.
  if (!document.documentElement.dataset.faqBound) {
    document.documentElement.dataset.faqBound = '1';
    document.addEventListener('click', function(e) {
      var btn = e.target.closest ? e.target.closest('.faq-question') : null;
      if (!btn) return;
      var item = btn.closest('.faq-item');
      if (!item) return;
      var answer = item.querySelector('.faq-answer');
      var inner = answer ? answer.querySelector('.faq-answer-inner') : null;
      var wasOpen = item.classList.contains('open');

      item.parentNode.querySelectorAll('.faq-item.open').forEach(function(openItem) {
        openItem.classList.remove('open');
        var q = openItem.querySelector('.faq-question');
        if (q) q.setAttribute('aria-expanded', 'false');
        var a = openItem.querySelector('.faq-answer');
        if (a) a.style.maxHeight = '0';
      });

      if (!wasOpen && answer && inner) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = inner.scrollHeight + 'px';
      }
    });

    // Recompute open answer heights on resize so mobile rotation / width changes don't clip content.
    window.addEventListener('resize', function() {
      document.querySelectorAll('.faq-item.open .faq-answer').forEach(function(a) {
        var inner = a.querySelector('.faq-answer-inner');
        if (inner) a.style.maxHeight = inner.scrollHeight + 'px';
      });
    }, { passive: true });
  }

  // ---- Marquee carousel duplication (seamless infinite scroll) ----
  document.querySelectorAll('.skills-carousel-inner, .testimonials-carousel-inner').forEach(function(inner) {
    var items = Array.from(inner.children);
    items.forEach(function(item) { inner.appendChild(item.cloneNode(true)); });
  });

  // ---- Pause marquees when off-screen ----
  document.querySelectorAll('.skills-carousel-wrapper, .testimonials-carousel-wrapper').forEach(function(wrapper) {
    var tracks = wrapper.querySelectorAll('.skills-carousel-inner, .testimonials-carousel-inner');
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        tracks.forEach(function(track) {
          track.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
        });
      });
    }, { threshold: 0 });
    observer.observe(wrapper);
  });

  // ---- Metrics bar animation (used on case-study pages) ----
  var metricBars = document.querySelectorAll('.metric-bar-fill');
  if (metricBars.length) {
    var metricsObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.style.width = entry.target.dataset.width;
          metricsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    metricBars.forEach(function(bar) { metricsObserver.observe(bar); });
  }

  // ---- Work slider (used on About page) ----
  var slider = document.getElementById('workSlider');
  var prevBtn = document.getElementById('sliderPrev');
  var nextBtn = document.getElementById('sliderNext');
  var dotsContainer = document.getElementById('sliderDots');
  if (slider && prevBtn && nextBtn && dotsContainer) {
    var cards = slider.querySelectorAll('.work-card');
    var computeCardWidth = function() {
      if (cards.length < 2) return 372;
      return cards[1].offsetLeft - cards[0].offsetLeft;
    };
    var currentIndex = 0;
    cards.forEach(function(_, i) {
      var dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      dot.addEventListener('click', function() { goToSlide(i); });
      dotsContainer.appendChild(dot);
    });
    var dots = dotsContainer.querySelectorAll('.slider-dot');
    function updateDots() {
      dots.forEach(function(dot, i) { dot.classList.toggle('active', i === currentIndex); });
    }
    function goToSlide(index) {
      currentIndex = Math.max(0, Math.min(index, cards.length - 1));
      slider.scrollTo({ left: currentIndex * computeCardWidth(), behavior: 'smooth' });
      updateDots();
    }
    prevBtn.addEventListener('click', function() { goToSlide(currentIndex - 1); });
    nextBtn.addEventListener('click', function() { goToSlide(currentIndex + 1); });
    slider.addEventListener('scroll', function() {
      var newIndex = Math.round(slider.scrollLeft / computeCardWidth());
      if (newIndex !== currentIndex) { currentIndex = newIndex; updateDots(); }
    }, { passive: true });
  }
})();
