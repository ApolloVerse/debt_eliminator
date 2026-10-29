import { createClient } from '@supabase/supabase-js';
import { DEMO_USER, MockQueryBuilder, mockStorage } from './mockStore';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
}
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// Check if credentials are placeholders or empty
export const isMisconfigured = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder');

// Known broken/paused Supabase domains – only mock placeholders
const BROKEN_DOMAINS = ['placeholder'];
const isKnownBroken = BROKEN_DOMAINS.some(d => supabaseUrl.includes(d));

// Demo mode: default is TRUE unless the user has explicitly logged in with real Supabase
export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('sp_demo_mode');
  if (stored === 'false' && !isMisconfigured && !isKnownBroken) return false;
  return true;
};

export const setDemoMode = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sp_demo_mode', enabled ? 'true' : 'false');
  }
};

// Real Supabase client instance
const realSupabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

type AuthListener = (event: string, session: any) => void;
const authListeners = new Set<AuthListener>();

const notifyAuth = (event: string, session: any) => {
  authListeners.forEach(fn => {
    try { fn(event, session); } catch {}
  });
};

// Universal Supabase Proxy: seamlessly directs queries to real Supabase or Local Mock
export const supabase = {
  auth: {
    getSession: async () => {
      if (isDemoMode()) {
        const loggedIn = localStorage.getItem('sp_demo_logged_in') !== 'false';
        if (loggedIn) {
          return { data: { session: { user: DEMO_USER, access_token: 'demo-token' } }, error: null };
        }
        return { data: { session: null }, error: null };
      }

      try {
        return await realSupabase.auth.getSession();
      } catch (err) {
        // Fallback to demo if network fails
        console.warn('Supabase getSession failed, falling back to demo session', err);
        return { data: { session: { user: DEMO_USER, access_token: 'demo-token' } }, error: null };
      }
    },

    onAuthStateChange: (callback: AuthListener) => {
      authListeners.add(callback);
      if (!isDemoMode()) {
        try {
          return realSupabase.auth.onAuthStateChange(callback);
        } catch {}
      }

      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },

    signInWithOAuth: async (options: any) => {
      // Always use demo if misconfigured – signInWithOAuth does a browser
      // redirect so there's no way to catch network errors after the call.
      if (isDemoMode() || isMisconfigured || isKnownBroken) {
        return signInAsDemo();
      }

      try {
        const res = await realSupabase.auth.signInWithOAuth(options);
        if (res.error) throw res.error;
        return res;
      } catch (err: any) {
        console.warn('OAuth failed, activating demo mode fallback:', err);
        return signInAsDemo();
      }
    },

    signOut: async () => {
      if (isDemoMode()) {
        localStorage.setItem('sp_demo_logged_in', 'false');
        notifyAuth('SIGNED_OUT', null);
        return { error: null };
      }
      try {
        return await realSupabase.auth.signOut();
      } catch {
        localStorage.setItem('sp_demo_logged_in', 'false');
        notifyAuth('SIGNED_OUT', null);
        return { error: null };
      }
    },
  },

  from: (table: string): any => {
    if (isDemoMode()) {
      return new MockQueryBuilder(table);
    }
    return realSupabase.from(table);
  },
};

export const signInAsDemo = async () => {
  setDemoMode(true);
  localStorage.setItem('sp_demo_logged_in', 'true');
  const session = { user: DEMO_USER, access_token: 'demo-token' };
  notifyAuth('SIGNED_IN', session);
  return { data: { session, user: DEMO_USER }, error: null };
};

export const signInWithGoogle = async () => {
  if (isMisconfigured || isKnownBroken) {
    console.warn('Supabase not configured, falling back to demo mode');
    return signInAsDemo();
  }

  // Switch demo mode off for real Supabase authentication
  setDemoMode(false);
  localStorage.setItem('sp_demo_logged_in', 'false');

  const { error } = await realSupabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) {
    console.warn('OAuth error, entering demo mode:', error);
    return signInAsDemo();
  }
};

export const logout = async () => {
  await supabase.auth.signOut();
};

export const resetDemoData = () => {
  mockStorage.resetAll();
};
