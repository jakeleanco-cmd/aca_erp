import { create } from 'zustand';
import client from '../api/client';

/**
 * UI 상태 관리 스토어
 * - viewMode: 'mobile' (고정 가로폭) 또는 'web' (전체 가로폭)
 * - 사용자가 설정한 viewMode는 로컬 스토리지 및 DB(Admin 모델)에 연동되어 보관됩니다.
 */
export const useUiStore = create((set, get) => {
  const savedViewMode = typeof window !== 'undefined' ? localStorage.getItem('viewMode') : null;
  const initialViewMode = savedViewMode === 'web' || savedViewMode === 'mobile' ? savedViewMode : 'mobile';

  // API를 호출해 DB의 viewMode를 갱신하는 헬퍼 함수
  const syncWithDb = async (mode) => {
    try {
      localStorage.setItem('viewMode', mode);
      
      // Zustand의 aca-auth 스토리지에서 토큰 확인
      const savedAuth = typeof window !== 'undefined' ? localStorage.getItem('aca-auth') : null;
      const token = savedAuth ? JSON.parse(savedAuth)?.state?.token : null;
      
      if (token) {
        await client.put('/auth/view-mode', { viewMode: mode });
      }
    } catch (err) {
      console.warn('[uiStore] DB 화면 모드 동기화 실패:', err.message);
    }
  };

  return {
    viewMode: initialViewMode,

    // 화면 모드 명시적 설정 및 DB 동기화
    setViewMode: (mode) => {
      set({ viewMode: mode });
      syncWithDb(mode);
    },
    
    // DB에서 로그인 정보를 불러온 직후 순수 로컬 상태만 설정할 때 사용 (루프 방지)
    setViewModeOnly: (mode) => {
      localStorage.setItem('viewMode', mode);
      set({ viewMode: mode });
    },
    
    // 화면 모드 토글 및 DB 동기화
    toggleViewMode: () => {
      const currentMode = get().viewMode;
      const nextMode = currentMode === 'mobile' ? 'web' : 'mobile';
      set({ viewMode: nextMode });
      syncWithDb(nextMode);
    },
  };
});
