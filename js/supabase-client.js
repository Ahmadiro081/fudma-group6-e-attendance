/**
 * FUDMA Group 6 E-Attendance System - Supabase Client Initialization
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 * Institution: Federal University Dutsin-Ma (FUDMA), Nigeria
 * 
 * Exposes:
 * - window.supabaseClient: Active Supabase JS client instance (or null)
 * - window.supabaseReady: Promise resolving when client is initialized (or null in Mock mode)
 */

import { createClient } from '@supabase/supabase-js';

// Read environment variables injected at build/runtime, or from localStorage fallback
const envUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__.VITE_SUPABASE_URL) ||
  (typeof window !== 'undefined' && window.localStorage && localStorage.getItem('fudma_supabase_url')) ||
  '';

const envKey = 
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)) ||
  (typeof window !== 'undefined' && window.__ENV__ && (window.__ENV__.VITE_SUPABASE_PUBLISHABLE_KEY || window.__ENV__.VITE_SUPABASE_ANON_KEY)) ||
  (typeof window !== 'undefined' && window.localStorage && (localStorage.getItem('fudma_supabase_publishable_key') || localStorage.getItem('fudma_supabase_anon_key'))) ||
  '';

let clientInstance = null;

if (envUrl && envKey) {
  try {
    clientInstance = createClient(envUrl.trim(), envKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined
      }
    });
    console.log('%c[Supabase Client] Successfully initialized with Supabase endpoint', 'color: #10b981; font-weight: bold;');
  } catch (err) {
    console.warn('[Supabase Client] Failed to create client:', err);
    clientInstance = null;
  }
} else {
  console.info('[Supabase Client] VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not configured. Running in Mock/Presentation mode.');
}

if (typeof window !== 'undefined') {
  window.supabaseClient = clientInstance;
  if (typeof window._resolveSupabase === 'function') {
    window._resolveSupabase(clientInstance);
  }
  window.supabaseReady = Promise.resolve(clientInstance);
}

export { clientInstance as supabaseClient };
