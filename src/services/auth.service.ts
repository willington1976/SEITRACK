import { supabase } from './supabase'

export const authService = {
  async signInWithEmail(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  },

  async signInWithOTP(email: string) {
    return supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
  },

  async signOut() {
    return supabase.auth.signOut()
  },

  async getSession() {
    return supabase.auth.getSession()
  },

  onAuthStateChange(cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(cb)
  }
}
