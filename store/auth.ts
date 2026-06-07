import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const TOKEN_KEY = 'stockmate.token';
const USER_KEY = 'stockmate.user';

export type User = Record<string, any>;

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  // True while we are reading persisted auth from AsyncStorage on app start.
  isHydrating: boolean;
  login: (token: string, user?: User | null) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isHydrating: true,

  login: async (token, user = null) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
    set({ token, user, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    set({ token: null, user: null, isAuthenticated: false });
  },

  // Rehydrate persisted auth on app start.
  hydrate: async () => {
    try {
      const [token, userRaw] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      set({
        token: token ?? null,
        user: userRaw ? (JSON.parse(userRaw) as User) : null,
        isAuthenticated: !!token,
        isHydrating: false,
      });
    } catch {
      set({ isHydrating: false });
    }
  },
}));
