import { db } from './shared.js';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
};

const HARDCODED_APP_CONFIG = {
  agentId: import.meta.env.PUBLIC_AGENT_ID || '',
  elevenLabsApiKey: import.meta.env.PUBLIC_ELEVENLABS_API_KEY || '',
  aiProvider: import.meta.env.PUBLIC_AI_PROVIDER || 'anthropic',
  aiApiKey: import.meta.env.PUBLIC_AI_API_KEY || '',
  adminHash: '',
};

let appConfig = Object.assign({}, HARDCODED_APP_CONFIG);

export function getConfig() {
  return appConfig;
}

export async function saveConfig(config) {
  if (!db) {
    console.error('Firestore not initialized');
    return;
  }
  try {
    appConfig = config;
    await db.collection('config').doc('app').set(config);
  } catch (err) {
    console.error('Error saving config to Firestore:', err);
  }
}

export async function loadConfigFromFirestore() {
  if (!db) {
    console.error('Firestore not initialized');
    return null;
  }
  try {
    const doc = await db.collection('config').doc('app').get();
    if (doc.exists) {
      appConfig = doc.data();
      return appConfig;
    }
    appConfig = Object.assign({}, HARDCODED_APP_CONFIG);
    await db.collection('config').doc('app').set(appConfig);
    return appConfig;
  } catch (err) {
    console.error('Error loading config from Firestore:', err);
    return null;
  }
}

export function isConfigured() {
  return appConfig && appConfig.agentId && appConfig.aiApiKey;
}

export { FIREBASE_CONFIG, HARDCODED_APP_CONFIG };
