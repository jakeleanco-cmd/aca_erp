/**
 * client/src/store/leanmathStore.js
 * 
 * 린매쓰 학생(LeanmathStudent)의 CRUD 상태와 비동기 API 통신을 담당하는 Zustand 스토어입니다.
 * - 조회, 등록, 수정, 삭제의 로딩 상태 및 에러 처리를 일원화합니다.
 * - 직관적인 액션 함수명과 비즈니스 의도가 담긴 한글 주석을 포함합니다.
 */

import { create } from 'zustand';
import client from '../api/client';

export const useLeanmathStore = create((set, get) => ({
  // 1. 상태 정의 (State)
  students: [], // 현재 페이지에 표시될 학생 리스트
  loading: false, // API 통신 중 로딩 플래그
  totalCount: 0, // 필터된 전체 학생 데이터 수
  page: 1, // 현재 페이지 번호
  limit: 10, // 한 페이지당 로우 수
  filters: {
    search: '', // 검색어 (이름, 학교, 반 이름)
    status: '', // 원생 상태 (재원, 퇴원, 대기 등)
  },
  error: null, // 에러 발생 시 담길 메시지

  // 2. 검색 필터 및 페이지 정보 갱신 액션 (Actions)
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      page: 1, // 필터가 바뀔 때는 1페이지로 리셋
    }));
    get().fetchStudents(); // 필터 갱신 후 즉시 재조회
  },

  setPage: (newPage) => {
    set({ page: newPage });
    get().fetchStudents(); // 페이지 변경 시 재조회
  },

  setLimit: (newLimit) => {
    set({ limit: newLimit, page: 1 });
    get().fetchStudents(); // 한 페이지당 개수 변경 시 재조회
  },

  // 3. 비동기 CRUD 액션 (Async API Handlers)
  
  /**
   * 학생 목록 조회 API 호출
   */
  fetchStudents: async () => {
    set({ loading: true, error: null });
    try {
      const { page, limit, filters } = get();
      
      // 쿼리 매개변수 설정
      const params = {
        page,
        limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
      };

      const response = await client.get('/leanmath-students', { params });
      
      // API 응답 구조: { students, total, page, limit }
      set({
        students: response.data.students || [],
        totalCount: response.data.total || 0,
        loading: false,
      });
    } catch (err) {
      console.error('Zustand: 학생 목록 조회 중 에러 발생', err);
      set({
        loading: false,
        error: err.response?.data?.message || '학생 목록을 가져오지 못했습니다.',
      });
    }
  },

  /**
   * 학생 상세 정보 조회
   * @param {string} id - MongoDB의 _id
   */
  getStudentById: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await client.get(`/leanmath-students/${id}`);
      set({ loading: false });
      return response.data;
    } catch (err) {
      console.error('Zustand: 학생 상세 조회 중 에러 발생', err);
      set({
        loading: false,
        error: err.response?.data?.message || '학생 정보를 상세 조회하지 못했습니다.',
      });
      throw err; // 컴포넌트 단에서 예외를 캐치하여 노출시킬 수 있도록 전파
    }
  },

  /**
   * 신규 학생 등록
   * @param {object} studentData - 학생 등록 폼 데이터
   */
  createStudent: async (studentData) => {
    set({ loading: true, error: null });
    try {
      const response = await client.post('/leanmath-students', studentData);
      set({ loading: false });
      get().fetchStudents(); // 등록 성공 후 목록 리로드
      return response.data;
    } catch (err) {
      console.error('Zustand: 학생 생성 중 에러 발생', err);
      set({
        loading: false,
        error: err.response?.data?.message || '학생 정보를 등록하지 못했습니다.',
      });
      throw err;
    }
  },

  /**
   * 학생 정보 업데이트
   * @param {string} id - MongoDB의 _id
   * @param {object} studentData - 학생 수정 폼 데이터
   */
  updateStudent: async (id, studentData) => {
    set({ loading: true, error: null });
    try {
      const response = await client.put(`/leanmath-students/${id}`, studentData);
      set({ loading: false });
      get().fetchStudents(); // 수정 성공 후 목록 리로드
      return response.data;
    } catch (err) {
      console.error('Zustand: 학생 정보 업데이트 중 에러 발생', err);
      set({
        loading: false,
        error: err.response?.data?.message || '학생 정보 수정에 실패했습니다.',
      });
      throw err;
    }
  },

  /**
   * 학생 정보 삭제
   * @param {string} id - MongoDB의 _id
   */
  deleteStudent: async (id) => {
    set({ loading: true, error: null });
    try {
      await client.delete(`/leanmath-students/${id}`);
      set({ loading: false });
      get().fetchStudents(); // 삭제 성공 후 목록 리로드
    } catch (err) {
      console.error('Zustand: 학생 삭제 중 에러 발생', err);
      set({
        loading: false,
        error: err.response?.data?.message || '학생 삭제에 실패했습니다.',
      });
      throw err;
    }
  },
}));
