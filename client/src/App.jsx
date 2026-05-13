import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { darkThemeConfig } from './theme/theme.js';
import { useAuthStore } from './store/authStore';
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

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ConfigProvider theme={darkThemeConfig}>
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
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
