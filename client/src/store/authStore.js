import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUiStore } from './uiStore';

/**
 * 관리자 JWT 토큰을 localStorage에 보관해 새로고침 후에도 유지한다.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      admin: null,
      setAuth: (token, admin) => {
        set({ token, admin });
        if (admin && admin.viewMode) {
          useUiStore.getState().setViewModeOnly(admin.viewMode);
        }
      },
      logout: () => set({ token: null, admin: null }),
    }),
    { name: 'aca-auth' }
  )
);
