import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
};

/**
 * Auth session store. Purely state — side effects (login/logout API calls)
 * live in services + feature hooks so the store never imports the API client.
 *
 * `hasHydrated` is set once localStorage has been read so route guards can
 * wait for the restored session before redirecting (avoids login flash).
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      ...initialState,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setSession: ({ user, accessToken, refreshToken }) => set({ user, accessToken, refreshToken }),
      clearSession: () => set({ ...initialState }),
    }),
    {
      name: 'auth',
      partialize: ({ user, accessToken, refreshToken }) => ({ user, accessToken, refreshToken }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);

/** True once the persisted session has been restored from localStorage. */
export const useAuthHydrated = () => useAuthStore((s) => s.hasHydrated);

export default useAuthStore;
