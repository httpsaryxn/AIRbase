import { create } from 'zustand';

interface UserStats {
  wins: number;
  losses: number;
  totalMatches: number;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  rank: 'Bronze' | 'Silver' | 'Gold' | 'Grandmaster';
  xp: number;
  stats: UserStats;
}

interface UserState {
  user: UserProfile | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  updateXP: (amount: number) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  
  // Example action to update XP locally
  updateXP: (amount) => set((state) => {
    if (!state.user) return {};
    return {
      user: { ...state.user, xp: state.user.xp + amount }
    };
  }),
}));