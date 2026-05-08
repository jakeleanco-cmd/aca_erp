import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * UI 상태 관리 스토어
 * - viewMode: 'mobile' (고정 가로폭) 또는 'web' (전체 가로폭)
 */
export const useUiStore = create(
  persist(
    (set) => ({
      viewMode: 'mobile', // 기본값은 모바일 모드

      setViewMode: (mode) => set({ viewMode: mode }),
      
      toggleViewMode: () => set((state) => ({ 
        viewMode: state.viewMode === 'mobile' ? 'web' : 'mobile' 
      })),
    }),
    {
      name: 'ui-storage', // 로컬 스토리지 키 이름
    }
  )
);
