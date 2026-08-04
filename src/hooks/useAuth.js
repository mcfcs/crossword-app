// Auth session hook. No-op (signed-out) when Supabase isn't configured, so the
// app stays fully usable as a guest.
import { useState, useEffect } from 'react';
import { supabase, supabaseEnabled } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!supabaseEnabled);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInEmail = (email) =>
    supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
  const signInGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  const signOut = () => supabase?.auth.signOut();

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';

  return { user, displayName, ready, enabled: supabaseEnabled, signInEmail, signInGoogle, signOut };
}
