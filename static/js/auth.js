/* ═══════════════════════════════════════════
   RAINBOW TOOLS — Firebase Auth (Google Only)
   ═══════════════════════════════════════════ */

(function () {
    'use strict';

    var firebaseAuth = null;
    var currentUser = null;
    var isAuthenticating = false;

    // ── DOM refs ──
    var modal = document.getElementById('auth-modal');
    var closeBtn = document.getElementById('auth-close');
    var googleBtn = document.getElementById('auth-google-btn');
    var errorEl = document.getElementById('auth-error');
    var accountBtn = document.getElementById('account-btn');
    var accountBtnMobile = document.getElementById('account-btn-mobile');

    // ── Initialize Firebase (CDN compat) ──
    function initFirebase() {
        if (typeof firebase === 'undefined') {
            console.error('[AUTH] Firebase SDK not loaded!');
            return;
        }
        console.log('[AUTH] Firebase SDK loaded, initializing...');
        var config = {
            apiKey: "AIzaSyDy_RTlea3U_naTKy6Lywqf0Hcb4d-r-so",
            authDomain: "rainbowtools-d033f.firebaseapp.com",
            projectId: "rainbowtools-d033f",
            storageBucket: "rainbowtools-d033f.firebasestorage.app",
            messagingSenderId: "125615206139",
            appId: "1:125615206139:web:a0c38c9e22588eee7b4a5e"
        };
        try {
            firebase.initializeApp(config);
            firebaseAuth = firebase.auth();
            console.log('[AUTH] Firebase initialized OK, authDomain:', config.authDomain);
        } catch (e) {
            console.error('[AUTH] Firebase init error:', e);
        }
    }

    // ── CSRF token ──
    function getCSRFToken() {
        var name = 'csrftoken';
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var c = cookies[i].trim();
            if (c.substring(0, name.length + 1) === (name + '=')) {
                return decodeURIComponent(c.substring(name.length + 1));
            }
        }
        return '';
    }

    // ── Send ID token to Django ──
    function sendToDjango(idToken) {
        return fetch('/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify({ idToken: idToken })
        }).then(function (r) { return r.json(); });
    }

    // ── Toast ──
    function showToast(message, type) {
        var container = document.getElementById('toast-container');
        if (!container) return;
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + (type || 'success');
        var icon = type === 'error'
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>';
        toast.innerHTML = icon + '<span>' + message + '</span>';
        container.appendChild(toast);
        requestAnimationFrame(function () { toast.classList.add('toast-show'); });
        setTimeout(function () {
            toast.classList.remove('toast-show');
            setTimeout(function () { toast.remove(); }, 300);
        }, 3000);
    }

    // ── Show error ──
    function showError(msg) {
        if (errorEl) errorEl.textContent = msg;
    }

    // ── Button loading state ──
    function setButtonLoading(loading) {
        if (!googleBtn) return;
        if (loading) {
            googleBtn.disabled = true;
            googleBtn.classList.add('auth-google-btn--loading');
            googleBtn.setAttribute('data-original', googleBtn.innerHTML);
            googleBtn.innerHTML = '<svg class="auth-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="m16.24 5.76-2.12 2.12"/><path d="M20 12h-4"/><path d="m16.24 18.24-2.12-2.12"/><path d="M12 20v-4"/><path d="m7.76 18.24 2.12-2.12"/><path d="M4 12h4"/><path d="m7.76 5.76 2.12 2.12"/></svg> Signing in...';
        } else {
            googleBtn.disabled = false;
            googleBtn.classList.remove('auth-google-btn--loading');
            if (googleBtn.hasAttribute('data-original')) {
                googleBtn.innerHTML = googleBtn.getAttribute('data-original');
            }
        }
        isAuthenticating = loading;
    }

    // ── Modal open/close ──
    function openModal() {
        if (modal) {
            modal.classList.add('open');
            if (errorEl) errorEl.textContent = '';
        }
    }
    function closeModal() {
        if (isAuthenticating) return;
        if (modal) {
            modal.classList.remove('open');
            if (errorEl) errorEl.textContent = '';
        }
    }

    // ── Update navbar for logged-in user ──
    function showLoggedIn(user) {
        currentUser = user;
        var name = user.displayName || user.email || 'User';
        var initial = name.charAt(0).toUpperCase();

        var chipHTML = '<div class="auth-user-chip" id="auth-user-chip">'
            + '<div class="auth-user-avatar">' + initial + '</div>'
            + '<span class="auth-user-name">' + name + '</span>'
            + '</div>'
            + '<div class="auth-user-dropdown" id="auth-user-dropdown">'
            + '<div class="auth-user-dropdown-item" style="pointer-events:none;opacity:0.7;">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
            + '<span>' + name + '</span>'
            + '</div>'
            + '<div class="auth-user-dropdown-sep"></div>'
            + '<button class="auth-user-dropdown-item" id="auth-logout-btn">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>'
            + '<span>Sign Out</span>'
            + '</button>'
            + '</div>';

        if (accountBtn) {
            accountBtn.outerHTML = '<div style="position:relative" id="account-wrapper">' + chipHTML + '</div>';
        }
        if (accountBtnMobile) {
            accountBtnMobile.outerHTML = '<button class="btn btn-ghost btn-block" id="auth-logout-btn-mobile">'
                + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>'
                + 'Sign Out</button>';
        }

        var chip = document.getElementById('auth-user-chip');
        var dropdown = document.getElementById('auth-user-dropdown');
        if (chip && dropdown) {
            chip.addEventListener('click', function (e) {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });
        }

        var logoutBtn = document.getElementById('auth-logout-btn');
        var logoutBtnMobile = document.getElementById('auth-logout-btn-mobile');
        if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
        if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', doLogout);

        document.addEventListener('click', function () {
            var dd = document.getElementById('auth-user-dropdown');
            if (dd) dd.classList.remove('open');
        });
    }

    function showLoggedOut() {
        currentUser = null;
        var wrapper = document.getElementById('account-wrapper');
        if (wrapper) {
            wrapper.outerHTML = '<button class="btn btn-sm btn-ghost" id="account-btn" aria-label="Account">'
                + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
                + ' Account</button>';
            var newBtn = document.getElementById('account-btn');
            if (newBtn) newBtn.addEventListener('click', openModal);
        }
    }

    // ── Complete auth after token ──
    function completeAuth(idToken) {
        console.log('[AUTH] completeAuth called, token length:', idToken.length);
        return sendToDjango(idToken).then(function (data) {
            console.log('[AUTH] Django response:', data.status, data.error || '');
            setButtonLoading(false);
            if (data.status === 'ok') {
                closeModal();
                showLoggedIn(data.user);
                showToast('Welcome, ' + (data.user.displayName || data.user.email || 'User') + '!');
            } else {
                showError(data.error || 'Login failed. Please try again.');
            }
        }).catch(function (e) {
            console.error('[AUTH] Django request failed:', e);
            setButtonLoading(false);
            showError('Connection error. Please try again.');
        });
    }

    // ── Logout ──
    function doLogout() {
        if (firebaseAuth) firebaseAuth.signOut().catch(function () {});
        fetch('/auth/logout/', {
            method: 'POST',
            headers: { 'X-CSRFToken': getCSRFToken() }
        }).then(function () {
            showLoggedOut();
            showToast('Signed out successfully');
        });
    }

    // ── Detect mobile ──
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    // ── Google sign-in ──
    function doGoogleLogin() {
        console.log('[AUTH] doGoogleLogin called');
        if (!firebaseAuth) {
            console.error('[AUTH] Firebase auth not initialized!');
            showError('Authentication unavailable. Please refresh the page.');
            return;
        }
        if (isAuthenticating) {
            console.log('[AUTH] Already authenticating, skipping');
            return;
        }

        errorEl.textContent = '';
        setButtonLoading(true);

        var provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        console.log('[AUTH] Using signInWithRedirect for all devices');

        firebaseAuth.signInWithRedirect(provider);
    }

    // ── Handle redirect result on page load ──
    function handleRedirectResult() {
        if (!firebaseAuth) return;
        console.log('[AUTH] Checking redirect result...');
        firebaseAuth.getRedirectResult().then(function (result) {
            if (result && result.user) {
                console.log('[AUTH] Redirect result has user:', result.user.uid, result.user.email);
                return result.user.getIdToken();
            }
            console.log('[AUTH] No redirect result');
            return null;
        }).then(function (idToken) {
            if (idToken) {
                console.log('[AUTH] Got ID token from redirect, sending to Django...');
                return completeAuth(idToken);
            }
        }).catch(function (e) {
            console.error('[AUTH] Redirect result error:', e.code, e.message);
            setButtonLoading(false);
            if (e.code === 'auth/user-cancelled-sign-in') return;
            if (e.code === 'auth/network-request-failed') {
                showError('Network error. Check your connection and try again.');
                return;
            }
            showError('Sign-in failed. Please try again.');
        });
    }

    // ── Check auth state on load ──
    function checkAuthState() {
        console.log('[AUTH] checkAuthState called');
        fetch('/auth/user/')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                console.log('[AUTH] Auth state:', data.authenticated ? 'logged in' : 'anonymous');
                if (data.authenticated) showLoggedIn(data.user);
            })
            .catch(function (e) {
                console.error('[AUTH] checkAuthState failed:', e);
            });
    }

    // ── Event bindings ──
    function bind() {
        console.log('[AUTH] Binding events, accountBtn:', !!accountBtn, 'googleBtn:', !!googleBtn);
        if (accountBtn) accountBtn.addEventListener('click', openModal);
        if (accountBtnMobile) accountBtnMobile.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal();
            });
        }
        if (googleBtn) {
            googleBtn.addEventListener('click', function (e) {
                e.preventDefault();
                console.log('[AUTH] Google button clicked');
                doGoogleLogin();
            });
        }
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
                closeModal();
            }
        });
    }

    console.log('[AUTH] Script loading...');
    initFirebase();
    bind();
    handleRedirectResult();
    checkAuthState();
    console.log('[AUTH] Script loaded, firebaseAuth:', !!firebaseAuth);

})();
