import { auth, currentUser, setCurrentUser } from './shared.js';
import { setIsSignUp, isSignUp } from './state.js';
import { loadConfigFromFirestore } from './config.js';
import { loadScoreHistory } from './firestore.js';

export function listenForAuth() {
  const setupEl = document.getElementById('setupScreen');
  const loadingEl = document.getElementById('loadingScreen');
  if (setupEl) setupEl.style.display = 'none';
  if (loadingEl) loadingEl.style.display = 'flex';

  auth.onAuthStateChanged(async user => {
    const loading = document.getElementById('loadingScreen');
    if (loading) loading.style.display = 'none';
    if (user) {
      setCurrentUser(user);
      await loadConfigFromFirestore();
      showApp();
    } else {
      setCurrentUser(null);
      showAuthScreen();
    }
  });
}

export function showAuthScreen() {
  const els = {
    authScreen: document.getElementById('authScreen'),
    appContainer: document.getElementById('appContainer'),
    userInfo: document.getElementById('userInfo'),
    setupScreen: document.getElementById('setupScreen'),
  };
  if (els.authScreen) els.authScreen.style.display = 'flex';
  if (els.appContainer) els.appContainer.classList.remove('visible');
  if (els.userInfo) els.userInfo.style.display = 'none';
  if (els.setupScreen) els.setupScreen.style.display = 'none';
}

export function showApp() {
  const els = {
    authScreen: document.getElementById('authScreen'),
    setupScreen: document.getElementById('setupScreen'),
    loadingScreen: document.getElementById('loadingScreen'),
    appContainer: document.getElementById('appContainer'),
    userInfo: document.getElementById('userInfo'),
    userEmail: document.getElementById('userEmail'),
    adminBtn: document.getElementById('adminBtn'),
  };
  if (els.authScreen) els.authScreen.style.display = 'none';
  if (els.setupScreen) els.setupScreen.style.display = 'none';
  if (els.loadingScreen) els.loadingScreen.style.display = 'none';
  if (els.appContainer) els.appContainer.classList.add('visible');
  if (els.userInfo) els.userInfo.style.display = 'flex';
  if (els.userEmail) els.userEmail.textContent = (currentUser && (currentUser.displayName || currentUser.email)) || '';
  if (els.adminBtn) els.adminBtn.style.display = 'inline-flex';
  loadScoreHistory();
}

export function toggleAuthMode() {
  const newIsSignUp = !isSignUp;
  setIsSignUp(newIsSignUp);

  const els = {
    title: document.getElementById('authTitle'),
    subtitle: document.getElementById('authSubtitle'),
    btn: document.getElementById('authBtn'),
    toggleText: document.getElementById('authToggleText'),
    toggleLink: document.getElementById('authToggleLink'),
    nameField: document.getElementById('signupNameField'),
    resetLink: document.getElementById('resetLink'),
    errEl: document.getElementById('authError'),
    sucEl: document.getElementById('authSuccess'),
  };

  if (els.title) els.title.textContent = newIsSignUp ? 'Create Account' : 'Welcome Back';
  if (els.subtitle) els.subtitle.textContent = newIsSignUp
    ? 'Sign up to start tracking your cold call performance'
    : 'Sign in to access your sales role play scorecards';
  if (els.btn) els.btn.textContent = newIsSignUp ? 'Create Account' : 'Sign In';
  if (els.toggleText) els.toggleText.textContent = newIsSignUp ? 'Already have an account?' : "Don't have an account?";
  if (els.toggleLink) els.toggleLink.textContent = newIsSignUp ? 'Sign in' : 'Create one';
  if (els.nameField) els.nameField.style.display = newIsSignUp ? 'block' : 'none';
  if (els.resetLink) els.resetLink.style.display = newIsSignUp ? 'none' : 'block';
  if (els.errEl) els.errEl.classList.remove('visible');
  if (els.sucEl) els.sucEl.classList.remove('visible');
}

export async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const btn = document.getElementById('authBtn');
  const errEl = document.getElementById('authError');
  const sucEl = document.getElementById('authSuccess');

  if (errEl) errEl.classList.remove('visible');
  if (sucEl) sucEl.classList.remove('visible');

  if (!email || !password) { if (errEl) { errEl.textContent = 'Please enter your email and password.'; errEl.classList.add('visible'); } return; }
  if (password.length < 6) { if (errEl) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.classList.add('visible'); } return; }

  btn.disabled = true;
  btn.textContent = isSignUp ? 'Creating account...' : 'Signing in...';

  try {
    if (isSignUp) {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      const name = document.getElementById('authName').value.trim();
      if (name) await cred.user.updateProfile({ displayName: name });
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (err) {
    let msg = 'An error occurred. Please try again.';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
    else if (err.code === 'auth/email-already-in-use') msg = 'An account with this email already exists. Try signing in.';
    else if (err.code === 'auth/weak-password') msg = 'Password is too weak. Use at least 6 characters.';
    else if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
    if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
  } finally {
    btn.disabled = false;
    btn.textContent = isSignUp ? 'Create Account' : 'Sign In';
  }
}

export async function handlePasswordReset() {
  const email = document.getElementById('authEmail').value.trim();
  const errEl = document.getElementById('authError');
  const sucEl = document.getElementById('authSuccess');
  if (!email) { if (errEl) { errEl.textContent = 'Enter your email above, then click "Forgot password?"'; errEl.classList.add('visible'); } return; }
  try {
    await auth.sendPasswordResetEmail(email);
    if (errEl) errEl.classList.remove('visible');
    if (sucEl) { sucEl.textContent = 'Password reset email sent! Check your inbox.'; sucEl.classList.add('visible'); }
  } catch { if (errEl) { errEl.textContent = 'Could not send reset email. Check your email address.'; errEl.classList.add('visible'); } }
}

export function handleLogout() {
  if (auth) auth.signOut();
}

window.toggleAuthMode = toggleAuthMode;
window.handleAuth = handleAuth;
window.handlePasswordReset = handlePasswordReset;
window.handleLogout = handleLogout;
