import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

const REFERRAL_BONUS_DAYS = 45;

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  hasReferralBonus: boolean;
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

  const hasReferralBonus = Boolean(
    profile?.referral_bonus_expires_at &&
    new Date(profile.referral_bonus_expires_at) > new Date()
  );

  async function fetchProfile(userId: string) {
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
          await fetchProfile(session.user.id);
          if (!initialized) { initialized = true; setLoading(false); }
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
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };

    if (data.user) {
      let referredById: string | null = null;
      if (referralCode) {
        const { data: refProfile } = await supabase
          .from('profiles')
          .select('id, referral_bonus_expires_at')
          .eq('referral_code', referralCode)
          .maybeSingle();
        if (refProfile) {
          referredById = (refProfile as { id: string }).id;

          // Grant or extend referral bonus to the referrer
          const bonusExpiry = new Date();
          bonusExpiry.setDate(bonusExpiry.getDate() + REFERRAL_BONUS_DAYS);
          await supabase
            .from('profiles')
            .update({ referral_bonus_expires_at: bonusExpiry.toISOString() })
            .eq('id', referredById);
        }
      }

      // Grant referral bonus to the new user (referee) if they used a referral code
      const bonusExpiry = new Date();
      bonusExpiry.setDate(bonusExpiry.getDate() + REFERRAL_BONUS_DAYS);

      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        referred_by: referredById,
        referral_bonus_expires_at: referredById ? bonusExpiry.toISOString() : null,
      });
    }

    return { error: null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, hasReferralBonus, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
