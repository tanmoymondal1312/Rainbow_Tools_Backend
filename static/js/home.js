/* ═══════════════════════════════════════════
   RAINBOW TOOLS — Homepage Interactions
   ═══════════════════════════════════════════ */

(function () {
    'use strict';

    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Navbar scroll effect ──
    var navbar = document.getElementById('navbar');
    function onScroll() {
        if (window.scrollY > 20) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
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
        mobileMenu.querySelectorAll('a, button').forEach(function (el) {
            el.addEventListener('click', function () {
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

    // ── Tool search ──
    var searchInput = document.getElementById('tool-search');
    var toolCards = document.querySelectorAll('.tool-card');
    var toolCategories = document.querySelectorAll('.tool-category');
    var emptyState = document.getElementById('tool-empty');

    function filterTools() {
        var query = (searchInput.value || '').toLowerCase().trim();
        var activeFilter = document.querySelector('.filter-btn.active');
        var category = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
        var visibleCount = 0;

        toolCards.forEach(function (card) {
            var name = (card.getAttribute('data-name') || '').toLowerCase();
            var cardCat = (card.getAttribute('data-category') || '').toLowerCase();
            var desc = (card.querySelector('p') || {}).textContent || '';
            desc = desc.toLowerCase();

            var matchesSearch = !query || name.indexOf(query) !== -1 || desc.indexOf(query) !== -1;
            var matchesCategory = category === 'all' || cardCat === category;

            if (matchesSearch && matchesCategory) {
                card.style.display = '';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show/hide category headings
        toolCategories.forEach(function (cat) {
            var catType = cat.getAttribute('data-category');
            var hasVisible = cat.querySelectorAll('.tool-card:not([style*="display: none"])').length > 0;
            var matchesCat = category === 'all' || catType === category;
            cat.style.display = hasVisible && matchesCat ? '' : 'none';
        });

        if (emptyState) {
            emptyState.style.display = visibleCount === 0 ? '' : 'none';
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterTools);
    }

    // ── Category filter buttons ──
    var filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            filterBtns.forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            filterTools();
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

    // ── Card hover spotlight ──
    if (!prefersReduced) {
        document.querySelectorAll('.tool-card, .why-item').forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
                card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
            });
        });
    }

})();
