import { createClient } from '@supabase/supabase-js';
import { DEMO_USER, MockQueryBuilder, mockStorage } from './mockStore';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
}
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// Check if credentials are placeholders or empty
export const isMisconfigured = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder');

// Known broken/paused Supabase domains - only mock placeholders
const BROKEN_DOMAINS = ['placeholder'];
const isKnownBroken = BROKEN_DOMAINS.some(d => supabaseUrl.includes(d));

export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem('sp_demo_mode');
  return stored !== 'false';
};

export const setDemoMode = (enabled: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sp_demo_mode', enabled ? 'true' : 'false');
  }
};

// Real Supabase client - ONLY for authentication
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

// Wrap a real Supabase session as a "demo-compatible" session
// This means ALL data queries use demo-user-123 userId, which matches the seeded data
const wrapRealUserAsDemoSession = (realSession: any) => {
  if (!realSession?.user) return realSession;
  const realUser = realSession.user;
  // Create a wrapper user that has the real user's metadata but uses demo-user-123 as the data userId
  const wrappedUser = {
    ...DEMO_USER,
    id: 'demo-user-123',
    email: realUser.email || realUser.user_metadata?.email || DEMO_USER.email,
    user_metadata: {
      ...DEMO_USER.user_metadata,
      ...realUser.user_metadata,
      name: realUser.user_metadata?.full_name || realUser.user_metadata?.name || realUser.email || DEMO_USER.user_metadata.name,
      full_name: realUser.user_metadata?.full_name || realUser.user_metadata?.name || DEMO_USER.user_metadata.full_name,
      avatar_url: realUser.user_metadata?.avatar_url || realUser.user_metadata?.picture || DEMO_USER.user_metadata.avatar_url,
    },
  };
  return { ...realSession, user: wrappedUser };
};

// Listen to real Supabase auth changes
if (typeof window !== 'undefined' && !isMisconfigured && !isKnownBroken) {
  try {
    realSupabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setDemoMode(false);
        const wrappedSession = wrapRealUserAsDemoSession(session);
        notifyAuth(event, wrappedSession);
      } else {
        notifyAuth(event, session);
      }
    });
  } catch {}
}

// Universal Supabase Proxy
// AUTH -> real Supabase (when configured)
// DATA -> always MockQueryBuilder with demo-user-123 as userId
export const supabase = {
  auth: {
    getSession: async () => {
      // Check real Supabase session first
      if (!isMisconfigured && !isKnownBroken) {
        try {
          const { data, error } = await realSupabase.auth.getSession();
          if (data?.session?.user) {
            setDemoMode(false);
            // Wrap real user session to use demo-user-123 for data queries
            const wrappedSession = wrapRealUserAsDemoSession(data.session);
            return { data: { session: wrappedSession }, error: null };
          }
        } catch (err) {
          console.warn('Real Supabase getSession error:', err);
        }
      }

      // Fall back to demo session
      const loggedIn = localStorage.getItem('sp_demo_logged_in') !== 'false';
      if (loggedIn) {
        return { data: { session: { user: DEMO_USER, access_token: 'demo-token' } }, error: null };
      }
      return { data: { session: null }, error: null };
    },

    onAuthStateChange: (callback: AuthListener) => {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },

    signInWithOAuth: async (options: any) => {
      if (isMisconfigured || isKnownBroken) {
        return signInAsDemo();
      }
      setDemoMode(false);
      localStorage.setItem('sp_demo_logged_in', 'false');
      return await realSupabase.auth.signInWithOAuth(options);
    },

    signOut: async () => {
      localStorage.removeItem('sp_demo_mode');
      localStorage.setItem('sp_demo_logged_in', 'false');
      try {
        await realSupabase.auth.signOut();
      } catch {}
      notifyAuth('SIGNED_OUT', null);
      return { error: null };
    },
  },

  // All data queries always use MockQueryBuilder
  // Data is keyed to 'demo-user-123' which matches all seeded records
  from: (table: string): any => {
    return new MockQueryBuilder(table);
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