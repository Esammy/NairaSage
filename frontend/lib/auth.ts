import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { clearSessionCookieFlag, setSessionCookieFlag } from "@/lib/session-cookie";

export type AuthUser = {
  id?: number;
  email?: string;
  username?: string;
  onboarded?: boolean;
  is_email_verified?: boolean;
  tier?: string;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setTokens: (access?: string | null, refresh?: string | null, user?: AuthUser | null) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (access, refresh, user) => {
        const nextAccess = access !== undefined ? access ?? null : get().accessToken;
        set({
          accessToken: nextAccess,
          refreshToken: refresh !== undefined ? refresh ?? null : get().refreshToken,
          user: user !== undefined ? user ?? null : get().user,
        });
        if (typeof window !== "undefined") {
          if (nextAccess) setSessionCookieFlag();
          else clearSessionCookieFlag();
        }
      },
      setUser: (user) => set({ user }),
      clear: () => {
        set({ accessToken: null, refreshToken: null, user: null });
        if (typeof window !== "undefined") clearSessionCookieFlag();
      },
    }),
    {
      name: "nairasage-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      skipHydration: true,
    }
  )
);

export const getAccessToken = () => useAuthStore.getState().accessToken;
export const getRefreshToken = () => useAuthStore.getState().refreshToken;
export const setTokens = (access?: string | null, refresh?: string | null, user?: AuthUser | null) =>
  useAuthStore.getState().setTokens(access, refresh, user);
export const setUser = (user: AuthUser | null) => useAuthStore.getState().setUser(user);
export const clearAuth = () => useAuthStore.getState().clear();

export default useAuthStore;
