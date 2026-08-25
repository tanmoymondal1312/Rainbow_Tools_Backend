/* ═══════════════════════════════════════════
   RAINBOW TOOLS — Firebase Auth (Django Bridge)
   ═══════════════════════════════════════════ */

(function () {
    'use strict';

    // ── Firebase SDK loaded via CDN ──
    var firebaseApp = null;
    var firebaseAuth = null;
    var currentUser = null;

    // ── DOM refs ──
    var modal = document.getElementById('auth-modal');
    var closeBtn = document.getElementById('auth-close');
    var googleBtn = document.getElementById('auth-google-btn');
    var emailForm = document.getElementById('auth-email-form');
    var emailInput = document.getElementById('auth-email');
    var passwordInput = document.getElementById('auth-password');
    var errorEl = document.getElementById('auth-error');
    var submitBtn = document.getElementById('auth-submit-btn');
    var switchBtn = document.getElementById('auth-switch-btn');
    var switchText = document.getElementById('auth-switch-text');
    var titleEl = document.getElementById('auth-title');
    var subtitleEl = document.getElementById('auth-subtitle');
    var accountBtn = document.getElementById('account-btn');
    var accountBtnMobile = document.getElementById('account-btn-mobile');

    var isSignup = false;

    // ── Initialize Firebase (CDN) ──
    function initFirebase() {
        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK not loaded');
            return;
        }
        var config = {
            apiKey: "AIzaSyDy_RTlea3U_naTKy6Lywqf0Hcb4d-r-so",
            authDomain: "rainbowtools-d033f.firebaseapp.com",
            projectId: "rainbowtools-d033f",
            storageBucket: "rainbowtools-d033f.firebasestorage.app",
            messagingSenderId: "125615206139",
            appId: "1:125615206139:web:a0c38c9e22588eee7b4a5e"
        };
        firebase.initializeApp(config);
        firebaseAuth = firebase.auth();
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

    // ── Show error ──
    function showError(msg) {
        errorEl.textContent = msg;
    }

    // ── Toggle mode ──
    function toggleMode() {
        isSignup = !isSignup;
        errorEl.textContent = '';
        if (isSignup) {
            titleEl.textContent = 'Create your account';
            subtitleEl.textContent = 'Start using Rainbow Tools with your account.';
            submitBtn.textContent = 'Create Account';
            switchText.textContent = 'Already have an account?';
            switchBtn.textContent = 'Sign In';
        } else {
            titleEl.textContent = 'Sign in to Rainbow Tools';
            subtitleEl.textContent = 'Access your account and saved preferences.';
            submitBtn.textContent = 'Sign In';
            switchText.textContent = "Don't have an account?";
            switchBtn.textContent = 'Sign Up';
        }
    }

    // ── Open/close modal ──
    function openModal() {
        modal.classList.add('open');
        errorEl.textContent = '';
        setTimeout(function () { emailInput.focus(); }, 100);
    }
    function closeModal() {
        modal.classList.remove('open');
        errorEl.textContent = '';
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

        // Bind chip click
        var chip = document.getElementById('auth-user-chip');
        var dropdown = document.getElementById('auth-user-dropdown');
        if (chip && dropdown) {
            chip.addEventListener('click', function (e) {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });
        }

        // Bind logout
        var logoutBtn = document.getElementById('auth-logout-btn');
        var logoutBtnMobile = document.getElementById('auth-logout-btn-mobile');
        if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
        if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', doLogout);

        // Close dropdown on outside click
        document.addEventListener('click', function () {
            var dd = document.getElementById('auth-user-dropdown');
            if (dd) dd.classList.remove('open');
        });
    }

    function showLoggedOut() {
        currentUser = null;
        // Restore Account button if wrapper exists
        var wrapper = document.getElementById('account-wrapper');
        if (wrapper) {
            wrapper.outerHTML = '<button class="btn btn-sm btn-ghost" id="account-btn" aria-label="Account">'
                + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
                + ' Account</button>';
            document.getElementById('account-btn').addEventListener('click', openModal);
        }
    }

    // ── Logout ──
    function doLogout() {
        if (firebaseAuth) {
            firebaseAuth.signOut().catch(function () {});
        }
        fetch('/auth/logout/', {
            method: 'POST',
            headers: { 'X-CSRFToken': getCSRFToken() }
        }).then(function () {
            showLoggedOut();
        });
    }

    // ── Google sign-in ──
    function doGoogleLogin() {
        if (!firebaseAuth) { showError('Firebase not initialized'); return; }
        var provider = new firebase.auth.GoogleAuthProvider();
        firebaseAuth.signInWithPopup(provider)
            .then(function (result) {
                return result.user.getIdToken();
            })
            .then(function (idToken) {
                return sendToDjango(idToken);
            })
            .then(function (data) {
                if (data.status === 'ok') {
                    closeModal();
                    showLoggedIn(data.user);
                } else {
                    showError(data.error || 'Login failed');
                }
            })
            .catch(function (err) {
                showError(err.message || 'Google sign-in failed');
            });
    }

    // ── Email sign-in/up ──
    function doEmailAuth(e) {
        e.preventDefault();
        errorEl.textContent = '';
        var email = emailInput.value.trim();
        var password = passwordInput.value;

        if (!firebaseAuth) { showError('Firebase not initialized'); return; }

        submitBtn.disabled = true;
        submitBtn.textContent = isSignup ? 'Creating…' : 'Signing in…';

        var authPromise = isSignup
            ? firebaseAuth.createUserWithEmailAndPassword(email, password)
            : firebaseAuth.signInWithEmailAndPassword(email, password);

        authPromise
            .then(function (result) {
                return result.user.getIdToken();
            })
            .then(function (idToken) {
                return sendToDjango(idToken);
            })
            .then(function (data) {
                submitBtn.disabled = false;
                if (data.status === 'ok') {
                    closeModal();
                    showLoggedIn(data.user);
                } else {
                    showError(data.error || 'Login failed');
                    submitBtn.textContent = isSignup ? 'Create Account' : 'Sign In';
                }
            })
            .catch(function (err) {
                submitBtn.disabled = false;
                submitBtn.textContent = isSignup ? 'Create Account' : 'Sign In';
                var msg = err.message || 'Authentication failed';
                if (msg.includes('auth/user-not-found')) msg = 'No account found with this email.';
                else if (msg.includes('auth/wrong-password')) msg = 'Incorrect password.';
                else if (msg.includes('auth/email-already-in-use')) msg = 'An account already exists with this email.';
                else if (msg.includes('auth/weak-password')) msg = 'Password must be at least 6 characters.';
                else if (msg.includes('auth/invalid-email')) msg = 'Invalid email address.';
                showError(msg);
            });
    }

    // ── Check auth state on load ──
    function checkAuthState() {
        fetch('/auth/user/')
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.authenticated) {
                    showLoggedIn(data.user);
                }
            });
    }

    // ── Event bindings ──
    function bind() {
        if (accountBtn) accountBtn.addEventListener('click', openModal);
        if (accountBtnMobile) accountBtnMobile.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) closeModal();
            });
        }
        if (googleBtn) googleBtn.addEventListener('click', doGoogleLogin);
        if (emailForm) emailForm.addEventListener('submit', doEmailAuth);
        if (switchBtn) switchBtn.addEventListener('click', toggleMode);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('open')) {
                closeModal();
            }
        });
    }

    // ── Init ──
    initFirebase();
    bind();
    checkAuthState();

})();
