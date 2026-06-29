import { create } from 'zustand';

/**
 * UI 상태 관리 스토어
 * - viewMode: 'mobile' (고정 가로폭) 또는 'web' (전체 가로폭)
 * - 사용자가 설정한 viewMode는 localStorage에 저장되어 페이지 새로고침 시에도 유지됩니다.
 */
export const useUiStore = create((set) => {
  // 로컬 스토리지에서 이전 설정을 불러오며, 없을 경우 기본값은 'mobile'로 설정합니다.
  const savedViewMode = typeof window !== 'undefined' ? localStorage.getItem('viewMode') : null;
  const initialViewMode = savedViewMode === 'web' || savedViewMode === 'mobile' ? savedViewMode : 'mobile';

  return {
    viewMode: initialViewMode,

    setViewMode: (mode) => {
      localStorage.setItem('viewMode', mode);
      set({ viewMode: mode });
    },
    
    toggleViewMode: () => set((state) => {
      const nextMode = state.viewMode === 'mobile' ? 'web' : 'mobile';
      localStorage.setItem('viewMode', nextMode);
      return { viewMode: nextMode };
    }),
  };
});

