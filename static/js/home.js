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

    // ── Tool data for suggestions ──
    var toolData = [];
    document.querySelectorAll('.tool-card').forEach(function (card) {
        toolData.push({
            el: card,
            name: card.getAttribute('data-name') || '',
            category: card.getAttribute('data-category') || '',
            desc: (card.querySelector('p') || {}).textContent || '',
            slug: (card.getAttribute('href') || '').split('/').filter(Boolean).pop() || ''
        });
    });

    // ── Search + suggestions ──
    var searchInput = document.getElementById('tool-search');
    var suggestionsEl = document.getElementById('search-suggestions');
    var toolCards = document.querySelectorAll('.tool-card');
    var toolCategories = document.querySelectorAll('.tool-category');
    var emptyState = document.getElementById('tool-empty');
    var activeIndex = -1;

    function getFilteredTools(query, category) {
        var results = toolData.filter(function (t) {
            var matchesSearch = !query || t.name.toLowerCase().indexOf(query) !== -1 || t.desc.toLowerCase().indexOf(query) !== -1;
            var matchesCategory = category === 'all' || t.category === category;
            return matchesSearch && matchesCategory;
        });

        if (query) {
            results.sort(function (a, b) {
                var aName = a.name.toLowerCase();
                var bName = b.name.toLowerCase();
                // Exact match
                if (aName === query && bName !== query) return -1;
                if (bName === query && aName !== query) return 1;
                // Starts with query
                var aStarts = aName.indexOf(query) === 0;
                var bStarts = bName.indexOf(query) === 0;
                if (aStarts && !bStarts) return -1;
                if (bStarts && !aStarts) return 1;
                // Name contains query (higher priority than desc)
                var aNameMatch = aName.indexOf(query) !== -1;
                var bNameMatch = bName.indexOf(query) !== -1;
                if (aNameMatch && !bNameMatch) return -1;
                if (bNameMatch && !aNameMatch) return 1;
                // Both in name or both in desc — shorter name wins
                return aName.length - bName.length;
            });
        }

        return results;
    }

    function renderSuggestions(matches) {
        activeIndex = -1;
        if (!matches.length) {
            suggestionsEl.innerHTML = '<div class="search-suggestion-empty">No tools found<span>Try a different search term</span></div>';
            suggestionsEl.classList.add('open');
            return;
        }
        var catColors = { image: '#3b82f6', pdf: '#ef4444', ai: '#a855f7' };
        var catIcons = {
            image: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
            pdf: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
            ai: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>'
        };
        var html = '';
        matches.forEach(function (t, i) {
            var color = catColors[t.category] || '#a855f7';
            var icon = catIcons[t.category] || catIcons.image;
            html += '<div class="search-suggestion" data-index="' + i + '" data-slug="' + t.slug + '">'
                + '<div class="search-suggestion-icon" style="background:' + color + '18;color:' + color + ';">'
                + icon
                + '</div>'
                + '<div class="search-suggestion-info">'
                + '<div class="search-suggestion-name">' + t.name + '</div>'
                + '<div class="search-suggestion-desc">' + t.desc + '</div>'
                + '</div>'
                + '<div class="search-suggestion-meta">'
                + '<span class="search-suggestion-cat">' + t.category + '</span>'
                + '<div class="search-suggestion-arrow">'
                + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'
                + '</div>'
                + '</div>'
                + '</div>';
        });
        suggestionsEl.innerHTML = html;
        suggestionsEl.classList.add('open');

        suggestionsEl.querySelectorAll('.search-suggestion[data-index]').forEach(function (s) {
            s.addEventListener('mousedown', function (e) {
                e.preventDefault();
                navigateToTool(s.getAttribute('data-slug'));
            });
        });
    }

    function navigateToTool(slug) {
        var match = toolData.find(function (t) { return t.slug === slug; });
        if (!match) return;
        suggestionsEl.classList.remove('open');
        searchInput.value = '';
        filterTools();

        // Scroll to the tool card
        var card = match.el;
        var categoryEl = card.closest('.tool-category');
        if (categoryEl) {
            categoryEl.style.display = '';
        }
        card.style.display = '';

        var offset = navbar.offsetHeight + 24;
        var top = card.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: prefersReduced ? 'auto' : 'smooth' });

        // Brief highlight
        card.style.transition = 'box-shadow 0.3s ease';
        card.style.boxShadow = '0 0 0 2px var(--purple), 0 8px 30px rgba(168,85,247,0.3)';
        setTimeout(function () { card.style.boxShadow = ''; }, 1500);
    }

    function updateActiveSuggestion(items) {
        items.forEach(function (s) { s.classList.remove('active'); });
        if (activeIndex >= 0 && activeIndex < items.length) {
            items[activeIndex].classList.add('active');
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }

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
        searchInput.addEventListener('input', function () {
            var query = searchInput.value.toLowerCase().trim();
            var activeFilter = document.querySelector('.filter-btn.active');
            var category = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';

            filterTools();

            if (query.length > 0) {
                var matches = getFilteredTools(query, category);
                renderSuggestions(matches);
            } else {
                suggestionsEl.classList.remove('open');
                suggestionsEl.innerHTML = '';
            }
        });

        searchInput.addEventListener('keydown', function (e) {
            var items = suggestionsEl.querySelectorAll('.search-suggestion[data-index]');
            if (!suggestionsEl.classList.contains('open') || !items.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                updateActiveSuggestion(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                updateActiveSuggestion(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < items.length) {
                    navigateToTool(items[activeIndex].getAttribute('data-slug'));
                } else if (items.length === 1) {
                    navigateToTool(items[0].getAttribute('data-slug'));
                }
            } else if (e.key === 'Escape') {
                suggestionsEl.classList.remove('open');
                searchInput.blur();
            }
        });

        searchInput.addEventListener('blur', function () {
            setTimeout(function () { suggestionsEl.classList.remove('open'); }, 150);
        });

        searchInput.addEventListener('focus', function () {
            var query = searchInput.value.toLowerCase().trim();
            if (query.length > 0) {
                var activeFilter = document.querySelector('.filter-btn.active');
                var category = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
                var matches = getFilteredTools(query, category);
                renderSuggestions(matches);
            }
        });
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
