import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';
import { useSession } from '@/components/providers/SessionProvider';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import OnboardingPage from '@/pages/OnboardingPage';
import HomePage from '@/pages/HomePage';
import PracticePage from '@/pages/PracticePage';
import AiTeacherPage from '@/pages/AiTeacherPage';
import KnowledgeGraphPage from '@/pages/KnowledgeGraphPage';
import ErrorNotesPage from '@/pages/ErrorNotesPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import CoursesPage from '@/pages/CoursesPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import DocsPage from '@/pages/DocsPage';
import OfflinePage from '@/pages/OfflinePage';
import { ONBOARDING_COMPLETE_KEY } from '@/pages/OnboardingPage';

function FirstLaunchRedirect() {
  const { status } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'loading') return;

    const onboardingComplete =
      typeof window !== 'undefined' &&
      localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';

    if (!onboardingComplete) {
      navigate('/onboarding', { replace: true });
      return;
    }

    if (status === 'authenticated' || status === 'guest') {
      navigate('/home', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [status, navigate]);

  return null;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<FirstLaunchRedirect />} />

      {/* First-launch onboarding */}
      <Route path="/onboarding" element={<OnboardingPage />} />

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
