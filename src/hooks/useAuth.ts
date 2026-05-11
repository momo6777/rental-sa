import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  
  login: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Fetch user metadata to get role
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (userError) throw userError;
      
      set({ user: { ...data.user, ...userData }, loading: false });
    } catch (error) {
      console.error('Login error:', error);
      set({ loading: false });
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, loading: false });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },
  
  checkSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: userData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) throw error;
        
        set({ user: { ...session.user, ...userData }, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('Session check error:', error);
      set({ user: null, loading: false });
    }
  },
}));

// Initialize session check
useAuth.getState().checkSession();