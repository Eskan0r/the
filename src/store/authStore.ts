import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface Profile {
  id: string
  username: string
  is_admin: boolean
}

interface AuthStore {
  user: User | null
  profile: Profile | null
  loading: boolean
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, username: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const profile = await fetchProfile(session.user.id)
      set({ user: session.user, profile, loading: false })
    } else {
      set({ loading: false })
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        set({ user: session.user, profile, loading: false })
      } else {
        set({ user: null, profile: null, loading: false })
      }
    })
  },

  signIn: async (email, password) => {
    console.log('[AuthStore] Attempting sign in for email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('[AuthStore] Sign in error:', error.message);
      return error.message;
    }
    const profile = await fetchProfile(data.user.id)
    console.log('[AuthStore] Sign in successful for user:', profile?.username);
    set({ user: data.user, profile })
    return null
  },

  signUp: async (email, password, username) => {
    console.log('[AuthStore] Attempting sign up for email:', email, 'username:', username);
    // validation
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existing) {
      console.error('[AuthStore] Sign up failed: Username already taken');
      return 'Username already taken';
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      console.error('[AuthStore] Sign up error:', error.message);
      return error.message;
    }
    if (!data.user) {
      console.error('[AuthStore] Sign up failed: No user data');
      return 'Signup failed';
    }

    await supabase
      .from('profiles')
      .update({ username })
      .eq('id', data.user.id)

    const profile = await fetchProfile(data.user.id)
    console.log('[AuthStore] Sign up successful for user:', profile?.username);
    set({ user: data.user, profile })
    return null
  },

  signOut: async () => {
    const { profile } = get();
    console.log('[AuthStore] Signing out user:', profile?.username);
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, is_admin')
    .eq('id', userId)
    .single()
  return data ?? null
}