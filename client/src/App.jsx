import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { lightThemeConfig } from './theme/theme.js';
import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';
import LoginPage from './pages/LoginPage.jsx';
import RegisterFirstPage from './pages/RegisterFirstPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import FindIdPage from './pages/FindIdPage.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import TimetablePage from './pages/TimetablePage.jsx';
import StudentsPage from './pages/StudentsPage.jsx';
import StudentEditPage from './pages/StudentEditPage.jsx';
import TextbooksPage from './pages/TextbooksPage.jsx';
import TextbookEditPage from './pages/TextbookEditPage.jsx';
import ClassSlotsPage from './pages/ClassSlotsPage.jsx';
import LearningPage from './pages/LearningPage.jsx';
import BillingPage from './pages/BillingPage.jsx';
import AdminsPage from './pages/AdminsPage.jsx';
import ExamSheetsPage from './pages/ExamSheetsPage.jsx';
import ExamPaperPage from './pages/ExamPaperPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import LeanmathPage from './pages/LeanmathPage.jsx';

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const { viewMode, setViewModeOnly } = useUiStore();

  // 최초 마운트 시, Vercel/SSR 배포 환경 등에서 발생할 수 있는 초기 상태 불일치를 방지하기 위해
  // 로그인된 계정 정보(authStore) 또는 로컬 스토리지에 저장된 마지막 뷰 모드를 불러와 스토어에 동기화합니다.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuth = localStorage.getItem('aca-auth');
      const adminViewMode = savedAuth ? JSON.parse(savedAuth)?.state?.admin?.viewMode : null;
      const saved = adminViewMode || localStorage.getItem('viewMode');
      
      if (saved === 'web' || saved === 'mobile') {
        setViewModeOnly(saved);
      }
    }
  }, [setViewModeOnly]);

  // 로그인 페이지를 포함하여 앱 전체 범위에서 마지막에 설정한 뷰 모드(PC/모바일) 스타일이 적용되도록 합니다.
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.classList.remove('view-mobile', 'view-web');
      root.classList.add(`view-${viewMode}`);
    }
    
    // 모바일 모드일 때만 배경 그라데이션 표시
    if (viewMode === 'mobile') {
      document.body.classList.add('has-bg');
    } else {
      document.body.classList.remove('has-bg');
    }
  }, [viewMode]);

  return (
    <ConfigProvider theme={lightThemeConfig}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register-first" element={<RegisterFirstPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/find-id" element={<FindIdPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/timetable" replace />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/new" element={<StudentEditPage />} />
            <Route path="students/:id/learning" element={<LearningPage />} />
            <Route path="students/:id" element={<StudentEditPage />} />
            <Route path="textbooks" element={<TextbooksPage />} />
            <Route path="textbooks/new" element={<TextbookEditPage />} />
            <Route path="textbooks/:id" element={<TextbookEditPage />} />
            <Route path="class-slots" element={<ClassSlotsPage />} />
            <Route path="bills" element={<BillingPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="admins" element={<AdminsPage />} />
            <Route path="exam-sheets" element={<ExamSheetsPage />} />
            <Route path="exam-papers" element={<ExamPaperPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="leanmath" element={<LeanmathPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
