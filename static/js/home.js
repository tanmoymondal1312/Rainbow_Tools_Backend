/* ═══════════════════════════════════════════
   RAINBOW TOOLS — Homepage Interactions
   ═══════════════════════════════════════════ */

(function () {
    'use strict';

    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Navbar scroll effect ──
    var navbar = document.getElementById('navbar');
    var lastScroll = 0;
    function onScroll() {
        var y = window.scrollY;
        if (y > 20) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
        lastScroll = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ── Mobile menu ──
    var toggle = document.getElementById('nav-toggle');
    var mobileMenu = document.getElementById('nav-mobile');
    if (toggle && mobileMenu) {
        toggle.addEventListener('click', function () {
            toggle.classList.toggle('active');
            mobileMenu.classList.toggle('open');
        });
        mobileMenu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                toggle.classList.remove('active');
                mobileMenu.classList.remove('open');
            });
        });
    }

    // ── Smooth scroll for anchor links ──
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var id = a.getAttribute('href');
            if (id === '#') return;
            var target = document.querySelector(id);
            if (target) {
                e.preventDefault();
                var offset = navbar.offsetHeight + 16;
                var top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top: top, behavior: prefersReduced ? 'auto' : 'smooth' });
            }
        });
    });

    // ── Scroll reveal ──
    if (!prefersReduced) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('[data-animate]').forEach(function (el, i) {
            el.style.transitionDelay = (i % 4) * 80 + 'ms';
            observer.observe(el);
        });
    } else {
        document.querySelectorAll('[data-animate]').forEach(function (el) {
            el.classList.add('visible');
        });
    }

    // ── Typing effect for preview ──
    var typingEl = document.querySelector('.preview-value.typing');
    if (typingEl && !prefersReduced) {
        var fullText = typingEl.getAttribute('data-text') || '';
        var idx = 0;
        function typeChar() {
            if (idx <= fullText.length) {
                typingEl.textContent = fullText.substring(0, idx);
                idx++;
                setTimeout(typeChar, 40 + Math.random() * 30);
            }
        }
        var typeObserver = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                setTimeout(typeChar, 600);
                typeObserver.disconnect();
            }
        }, { threshold: 0.5 });
        typeObserver.observe(typingEl);
    }

    // ── Card hover spotlight ──
    if (!prefersReduced) {
        document.querySelectorAll('.tool-card, .feature-item, .why-item, .usecase-card').forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var rect = card.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                card.style.setProperty('--mx', x + 'px');
                card.style.setProperty('--my', y + 'px');
            });
        });
    }

})();
