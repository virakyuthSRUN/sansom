import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
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
  hasProfile: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      setFetchAttempted(true);
      return;
    }

    // Prevent multiple simultaneous fetches
    if (fetchAttempted && profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        
        // If profile doesn't exist, create it with defaults
        if (error.code === 'PGRST116') { // No rows returned
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              phone: '',
              currency: 'USD',
              monthly_budget: 5000,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating profile:', createError);
            setProfile(null);
          } else {
            setProfile(newProfile);
          }
        } else {
          setProfile(null);
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
      setFetchAttempted(true);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]); // Only re-run when user changes

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
      
      // Update local state immediately for better UX
      if (profile) {
        setProfile({ ...profile, ...updates, updated_at: new Date().toISOString() });
      }
      
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
      hasProfile: !!profile,
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