import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, referralCode?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setProfile(data as Profile);
      } else if (error) {
        console.error('fetchProfile error:', error);
      }
    } catch (err) {
      console.error('fetchProfile unexpected error:', err);
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  useEffect(() => {
    let initialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          try {
            await fetchProfile(session.user.id);
          } catch {
            // profile fetch failed; user is still authed
          } finally {
            if (!initialized) { initialized = true; setLoading(false); }
          }
        })();
      } else {
        setProfile(null);
        if (!initialized) { initialized = true; }
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string, fullName: string, referralCode?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error };

      if (data.user) {
        let referredById: string | null = null;
        if (referralCode) {
          const { data: refProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', referralCode)
            .maybeSingle();
          if (refProfile) {
            referredById = (refProfile as { id: string }).id;
          }
        }

        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: fullName,
          referred_by: referredById,
        });
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
