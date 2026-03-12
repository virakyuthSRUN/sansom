import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  monthly_budget: number;
  created_at: string;
  updated_at: string;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Refresh profile after update
      await fetchProfile();
      return { error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error };
    }
  };

  return (
    <UserProfileContext.Provider value={{
      profile,
      loading,
      updateProfile,
      refreshProfile: fetchProfile,
    }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};