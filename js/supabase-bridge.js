import { supabaseClient } from './supabase-client.js';

// Expose the initialized client to the existing classic-script architecture.
window.supabaseClient = supabaseClient;

window.supabaseReady = Promise.resolve(supabaseClient);

console.info('[Supabase] Client bridge initialized.');
