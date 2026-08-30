import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import UserLayout from './components/UserLayout';
import Home from './pages/Home';
import UserPending from './pages/UserPending';
import UserReports from './pages/UserReports';
import Fill from './pages/Fill';
import Report from './pages/Report';
import LoveTriPoster from './pages/lovetri/LoveTriPoster';
import LoveTriMatch from './pages/lovetri/LoveTriMatch';
import Match from './pages/Match';
import Login from './pages/Login';
import SetNickname from './pages/SetNickname';

import AdminLayout from './pages/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAssessments from './pages/admin/AdminAssessments';
import AdminAssessmentEdit from './pages/admin/AdminAssessmentEdit';
import AdminResponses from './pages/admin/AdminResponses';
import AdminResponseDetail from './pages/admin/AdminResponseDetail';
import AdminDistribute from './pages/admin/AdminDistribute';
import AdminReports from './pages/admin/AdminReports';
import AdminReportsByAssessment from './pages/admin/AdminReportsByAssessment';
import AdminResponsesAll from './pages/admin/AdminResponsesAll';
import AdminAssessmentAnalytics from './pages/admin/AdminAssessmentAnalytics';
import AdminUnlockCodes from './pages/admin/AdminUnlockCodes';
import AdminUsers from './pages/admin/AdminUsers';

const queryClient = new QueryClient();

function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <Outlet />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          {/* 登录与昵称设置（无需登录态保护） */}
          <Route path="/login" element={<Login />} />
          <Route path="/set-nickname" element={<SetNickname />} />

          {/* 用户端（带左侧菜单，需登录） */}
          <Route element={<RequireAuth />}>
            <Route element={<UserLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/pending" element={<UserPending />} />
              <Route path="/my" element={<UserReports />} />
            </Route>

            {/* 测评流程（需登录，保持沉浸） */}
            <Route path="/fill/:code" element={<Fill />} />
            <Route path="/report/:responseId" element={<Report />} />
            <Route path="/report/las/:responseId" element={<Report />} />
            <Route path="/report/:responseId/poster" element={<LoveTriPoster />} />
          <Route path="/match/:pairCode" element={<Match />} />
          <Route path="/lovetri/match/:pairCode" element={<LoveTriMatch />} />
          </Route>

          {/* 管理后台 */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="assessments" element={<AdminAssessments />} />
            <Route path="assessments/:id" element={<AdminAssessmentEdit />} />
            <Route path="assessments/:id/analytics" element={<AdminAssessmentAnalytics />} />
            <Route path="responses" element={<AdminResponsesAll />} />
            <Route path="responses/:responseId" element={<AdminResponseDetail />} />
            <Route path="assessments/:id/responses" element={<AdminResponses />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="distribute" element={<AdminDistribute />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="reports/assessments/:id" element={<AdminReportsByAssessment />} />
            <Route path="unlock-codes" element={<AdminUnlockCodes />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
