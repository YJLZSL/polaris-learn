import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import HomePage from '@/pages/HomePage';
import PracticePage from '@/pages/PracticePage';
import AiTeacherPage from '@/pages/AiTeacherPage';
import KnowledgeGraphPage from '@/pages/KnowledgeGraphPage';
import ErrorNotesPage from '@/pages/ErrorNotesPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import CoursesPage from '@/pages/CoursesPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import DocsPage from '@/pages/DocsPage';
import OfflinePage from '@/pages/OfflinePage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />

      {/* Public-only routes (login/register) */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes (dashboard) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/ai-teacher" element={<AiTeacherPage />} />
        <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
        <Route path="/error-notes" element={<ErrorNotesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Public routes */}
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/offline" element={<OfflinePage />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
