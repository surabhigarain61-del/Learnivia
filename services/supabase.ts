import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default credentials provided by user
const PROJECT_URL = 'https://xrhhyqgfabeldmisxcms.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyaGh5cWdmYWJlbGRtaXN4Y21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MTUyNTYsImV4cCI6MjA4MTI5MTI1Nn0.jK6EzAOW2JDNTKU_vphbMqVH0MORTejjQ2qJY7Aq1EI';

// Helper to safely access env vars (handling both process.env and import.meta.env contexts)
const getEnvVar = (key: string) => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) { /* ignore */ }
  
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) { /* ignore */ }

  return '';
};

const isPlaceholder = (val: string) => !val || val.includes("YOUR_") || val.includes("placeholder");

// Use environment variables if available AND valid, otherwise fall back to the provided keys
const envUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const envKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

const supabaseUrl = (envUrl && !isPlaceholder(envUrl)) ? envUrl : PROJECT_URL;
const supabaseAnonKey = (envKey && !isPlaceholder(envKey)) ? envKey : ANON_KEY;

let client: SupabaseClient;

if (supabaseUrl && supabaseAnonKey && !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey)) {
  client = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("Supabase credentials missing or invalid! Using mock client. Network features will be disabled.");
  
  // Mock Client to prevent "Failed to fetch" errors if keys are somehow missing
  const mockAuth = {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ error: { message: "Supabase not configured (Mock Mode)" } }),
    signUp: () => Promise.resolve({ error: { message: "Supabase not configured (Mock Mode)" } }),
    signInWithOAuth: () => Promise.resolve({ error: { message: "Supabase not configured (Mock Mode)" } }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    resend: () => Promise.resolve({ error: null }),
  };

  const mockFrom = () => {
    return {
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
        eq: () => Promise.resolve({ data: [], error: null }),
        then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve)
      }),
      insert: () => Promise.resolve({ error: null }),
      upsert: () => Promise.resolve({ error: null }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null })
      })
    };
  };

  // Cast to any to bypass strict type checks for the mock
  client = {
    auth: mockAuth,
    from: mockFrom
  } as any;
}

export const supabase = client;