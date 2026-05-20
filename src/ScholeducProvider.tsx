import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { UserProfile } from './types';
import { User } from '@supabase/supabase-js';

interface ScholeducContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, age: number, sex: string) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: 'teacher' | 'student') => Promise<void>;
}

const ScholeducContext = createContext<ScholeducContextType | undefined>(undefined);

export function ScholeducProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let isMounted = true;

    // Safety timeout: stop loading after 10 seconds to avoid blank screen
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth system taking too long - forcing UI ready state');
        setLoading(false);
      }
    }, 10000);

    const init = async () => {
      console.log('Initializing Secure Session...');
      try {
        // Attempt to get session - this will fail if URLs are missing
        const sessionRes = await supabase.auth.getSession();
        
        if (sessionRes.error) {
          console.error('Supabase Auth Error:', sessionRes.error.message);
          throw sessionRes.error;
        }

        const currentUser = sessionRes.data.session?.user ?? null;
        console.log('Auth Active:', currentUser?.id || 'Anonymous');
        
        if (isMounted) {
          setUser(currentUser);
          if (currentUser) {
            await fetchProfile(currentUser.id);
          }
        }

        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!isMounted) return;
          console.log('Session Transition:', _event);
          
          const newUser = session?.user ?? null;
          setUser(newUser);
          if (newUser) {
            await fetchProfile(newUser.id);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });
        
        if (isMounted) {
          subscription = data.subscription;
        }
      } catch (err: any) {
        console.error('Critical initialization failure:', err);
        // If it's a configuration error, we want the loading to stop so the ErrorBoundary or Login can handle it
        if (isMounted) setLoading(false);
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(timeoutId);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('uid', uid)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } else {
      setProfile(data as UserProfile);
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email: string, password: string, displayName: string, age: number, sex: string) => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          display_name: displayName,
          age,
          sex,
          role: 'student'
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error('Registration failed');

    // If confirmation is required, session might be null.
    // We try to create the profile, but it might fail if RLS is strict.
    const newProfile: UserProfile = {
      uid: data.user.id,
      email: data.user.email || email,
      display_name: displayName,
      age,
      sex,
      role: 'student',
      created_at: new Date().toISOString(),
    };

    // If we have a session (Email confirmation is OFF in Supabase), we proceed to create the profile and log in
    if (data.session) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([newProfile], { onConflict: 'uid' });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
      setProfile(newProfile);
      setUser(data.user);
    } else {
      // If no session, it likely means email confirmation is ON in your Supabase Dashboard.
      // We still try to create the profile, but it might fail due to RLS if not authenticated.
      console.warn('Registration successful but no session returned. Email confirmation might be required in Supabase settings.');
      // I'll show a friendlier error if the user hasn't disabled email confirmation yet.
      throw new Error('Verification required. To disable this, turn off "Confirm email" in your Supabase Auth settings.');
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const setRole = async (role: 'teacher' | 'student') => {
    console.log('Setting role for user:', user?.id, 'to:', role);
    if (!user) {
      console.error('No user found in setRole');
      return;
    }
    
    const newProfileData: UserProfile = profile ? { ...profile, role } : {
      uid: user.id,
      email: user.email || '',
      display_name: user.user_metadata?.display_name || 'Anonymous User',
      age: user.user_metadata?.age || 0,
      sex: user.user_metadata?.sex || 'other',
      role,
      created_at: new Date().toISOString()
    };

    console.log('Upserting profile data:', newProfileData);

    const { data, error } = await supabase
      .from('profiles')
      .upsert([newProfileData], { onConflict: 'uid' })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert error:', error);
      throw new Error(`Failed to save profile: ${error.message}`);
    }
    
    console.log('Profile saved successfully:', data);
    setProfile(newProfileData);
  };

  return (
    <ScholeducContext.Provider value={{ user, profile, loading, login, register, logout, setRole }}>
      {children}
    </ScholeducContext.Provider>
  );
}

export function useScholeduc() {
  const context = useContext(ScholeducContext);
  if (context === undefined) {
    throw new Error('useScholeduc must be used within a ScholeducProvider');
  }
  return context;
}
