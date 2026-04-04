import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { login, getMe } from '@/api';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  team_id?: string | null;
  player_id?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  refreshMe: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await login(email, password);
        const { token, user } = data;
        localStorage.setItem('token', token);
        const u = user as AuthUser;
        set({
          token,
          user: {
            id: u.id,
            email: u.email,
            role: u.role,
            team_id: u.team_id ?? null,
            player_id: u.player_id ?? null,
          },
          isAuthenticated: true,
        });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),

      refreshMe: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const { data } = await getMe();
          const u = data as {
            userId: string;
            email: string;
            role: string;
            teamId: string | null;
            playerId: string | null;
          };
          set({
            user: {
              id: u.userId,
              email: u.email,
              role: u.role,
              team_id: u.teamId,
              player_id: u.playerId,
            },
          });
        } catch {
          /* keep cached user */
        }
      },
    }),
    { name: 'auth-storage' }
  )
);
