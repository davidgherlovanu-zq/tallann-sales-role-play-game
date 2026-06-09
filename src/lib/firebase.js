import { FIREBASE_CONFIG } from './config.js';
import { setDb, setAuth } from './shared.js';
import { listenForAuth } from './auth.js';

export function initFirebase() {
  const scripts = [
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  ];

  function onReady() {
    if (typeof firebase === 'undefined') return;
    try {
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      setAuth(firebase.auth());
      setDb(firebase.firestore());
      listenForAuth();
    } catch (e) {
      console.error('Firebase init error:', e);
    }
  }

  if (typeof firebase !== 'undefined') {
    onReady();
    return;
  }

  let loaded = 0;
  function loadNext() {
    if (loaded >= scripts.length) {
      onReady();
      return;
    }
    const s = document.createElement('script');
    s.src = scripts[loaded];
    s.onload = () => { loaded++; loadNext(); };
    s.onerror = () => { console.error('Failed to load:', scripts[loaded]); };
    document.head.appendChild(s);
  }
  loadNext();
}

window.initFirebase = initFirebase;
