/**
 * FUDMA E-Attendance System - Firebase Configuration & Engine Manager
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 * Institution: Federal University Dutsin-Ma (FUDMA), Nigeria
 * 
 * Provides dual-engine architecture:
 * 1. Live Google Firebase (Authentication, Cloud Firestore, Cloud Functions) when config is provided.
 * 2. High-Fidelity Local Simulation Engine (persisted in browser storage) for reliable offline
 *    demonstration, physical classroom assessment, and testing without network dependencies.
 */

const STORAGE_KEY_FIREBASE_CONFIG = 'fudma_firebase_config_v1';
const STORAGE_KEY_ENGINE_MODE = 'fudma_engine_mode_v1';

// Default / Active Firebase Web App configuration
// Official project credentials for FUDMA GET 411 Group 6 E-Attendance System
const defaultFirebaseConfig = {
  apiKey: "AIzaSyDDnrHBki6jRTEEXiIBq_NZnNP1PeM79a0",
  authDomain: "fudma-group-6-e-attendance-web.firebaseapp.com",
  projectId: "fudma-group-6-e-attendance-web",
  storageBucket: "fudma-group-6-e-attendance-web.firebasestorage.app",
  messagingSenderId: "413948956126",
  appId: "1:413948956126:web:52e0f534f168a17549e14f",
  measurementId: "G-YPVDVMSXPV",
  functionsRegion: "us-central1" // Configured Cloud Functions deployment region
};

class FirebaseConfigManager {
  constructor() {
    this.config = this.loadConfig();
    const savedMode = localStorage.getItem(STORAGE_KEY_ENGINE_MODE);
    // In this Supabase-migrated application, Supabase is the primary cloud engine.
    // Firebase is strictly preserved for legacy recovery only when explicitly set to 'firebase'.
    this.mode = savedMode === 'firebase' ? 'firebase' : (savedMode === 'mock' ? 'mock' : 'supabase');
    this.status = this.mode === 'firebase' ? 'uninitialized' : 'connected'; // 'uninitialized' | 'connected' | 'error' | 'mock'
    this.initError = null;
    this.firebaseApp = null;
    this.auth = null;
    this.firestore = null;
    this.functions = null;
    this._initPromise = null;
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.apiKey && parsed.projectId) {
          return { ...defaultFirebaseConfig, ...parsed };
        }
      }
    } catch (e) {
      console.warn('[FirebaseConfigManager] Failed to parse stored Firebase config:', e);
    }
    return { ...defaultFirebaseConfig };
  }

  saveConfig(newConfig, mode = 'firebase') {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(this.config));
    this.mode = mode;
    localStorage.setItem(STORAGE_KEY_ENGINE_MODE, mode);
    this._initPromise = null; // Reset promise to allow re-initialization if needed
  }

  isConfigured() {
    return !!(
      this.config.apiKey &&
      this.config.projectId &&
      this.config.apiKey.length > 10 &&
      this.config.projectId.length > 3
    );
  }

  getMode() {
    return this.mode;
  }

  setMode(mode) {
    this.mode = mode;
    localStorage.setItem(STORAGE_KEY_ENGINE_MODE, mode);
  }

  /**
   * Initializes the active engine (Firebase or Local Mock).
   * Ensures Firebase is initialized only once and does not silently fall back to mock
   * mode when configured for live Firebase.
   */
  async initialize() {
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = (async () => {
      if (this.mode === 'firebase') {
        if (typeof firebase === 'undefined') {
          const err = new Error('Firebase Compat SDK is not loaded in the window environment.');
          this.status = 'error';
          this.initError = err;
          console.error('[Firebase Init Error]', err);
          return false;
        }

        if (!this.isConfigured()) {
          const err = new Error('Firebase configuration is unconfigured or incomplete. Please provide valid project credentials.');
          this.status = 'error';
          this.initError = err;
          console.warn('[Firebase Init Notice]', err.message);
          return false;
        }

        try {
          // Initialize Firebase only once
          if (!firebase.apps || !firebase.apps.length) {
            this.firebaseApp = firebase.initializeApp(this.config);
          } else {
            this.firebaseApp = firebase.app();
          }

          // Core services
          this.auth = firebase.auth();
          this.firestore = firebase.firestore();

          // Prepare Firebase Functions client for configured region (us-central1)
          const region = this.config.functionsRegion || 'us-central1';
          if (typeof firebase.functions === 'function') {
            try {
              this.functions = firebase.app().functions(region);
            } catch (fnErr) {
              console.warn('[Firebase Functions Warning]', fnErr);
            }
          }

          this.status = 'connected';
          this.initError = null;
          
          console.log(
            `%c[Firebase SDK] Initialized for project: "${this.config.projectId}"`,
            'color: #10b981; font-weight: bold;'
          );
          return true;
        } catch (err) {
          this.status = 'error';
          this.initError = err;
          console.error('[Firebase Init Failure] Could not initialize Firebase Cloud Engine:', err);
          return false;
        }
      } else {
        // Explicit Presentation Mock Engine
        this.status = 'mock';
        this.initError = null;
        console.log('[FUDMA Local Engine] Running in High-Fidelity Local Simulation Engine (Presentation Mode).');
        return true;
      }
    })();

    return this._initPromise;
  }

  handleApiError(err) {
    if (!err) return;
    const msg = String(err.message || err.code || err);
    if (msg.includes('API_KEY_INVALID') || msg.includes('api-key-not-valid') || msg.includes('API key not valid')) {
      console.error('[FirebaseManager] Inactive or invalid Firebase API key detected:', msg);
      this.status = 'error';
      this.initError = new Error('The Firebase API key is inactive or restricted in Google Cloud Console. Cloud operations are blocked until resolved in Firebase Console.');
      if (window.app && typeof window.app.updateEngineBadge === 'function') {
        window.app.updateEngineBadge();
      }
    }
  }
}

const firebaseManager = new FirebaseConfigManager();
window.firebaseManager = firebaseManager;
