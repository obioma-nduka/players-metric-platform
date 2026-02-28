import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login } from '@/api';

type User = {
  id: string;
  email: string;
  role: string;
  team_id?: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await login(email, password);
        const { token, user } = data;
        localStorage.setItem('token', token);
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    { name: 'auth-storage' }
  )
);