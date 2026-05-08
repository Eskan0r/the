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
  signIn: (username: string, password: string) => Promise<string | null>
  signUp: (username: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

// Users never see this email — it's just how Supabase auth works internally
const toEmail = (username: string) => `${username.toLowerCase().trim()}@market.internal`

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

    // Track subscription so it can be cleaned up if init() is ever called again
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        set({ user: session.user, profile, loading: false })
      } else {
        set({ user: null, profile: null, loading: false })
      }
    })

    // Expose cleanup — call window.__authUnsub?.() before re-init if needed
    ;(window as any).__authUnsub = () => subscription.unsubscribe()
  },

  signIn: async (username, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    })
    if (error) {
      // Supabase returns "Invalid login credentials" for both bad username and bad password.
      // Return a friendlier message.
      return 'Invalid username or password'
    }
    const profile = await fetchProfile(data.user.id)
    set({ user: data.user, profile })
    return null
  },

  signUp: async (username, password) => {
    const trimmed = username.trim()
    if (!trimmed) return 'Username required'
    if (trimmed.length < 3) return 'Username must be at least 3 characters'
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return 'Username can only contain letters, numbers, and underscores'

    // Check if username is taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', trimmed)
      .maybeSingle()

    if (existing) return 'Username already taken'

    const { data, error } = await supabase.auth.signUp({
      email: toEmail(trimmed),
      password,
    })
    if (error) return error.message
    if (!data.user) return 'Signup failed'

    // upsert rather than update — safe whether or not a trigger pre-created the row
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, username: trimmed })

    if (profileError) return profileError.message

    const profile = await fetchProfile(data.user.id)
    set({ user: data.user, profile })
    return null
  },

  signOut: async () => {
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