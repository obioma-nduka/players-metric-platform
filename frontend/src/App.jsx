import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import TeamPlayersPage from './pages/TeamPlayersPage'
import PlayerDetailPage from './pages/PlayerDetailPage'
import UsersPage from './pages/UsersPage'
import MyMetricsPage from './pages/MyMetricsPage'
import MetricTypesPage from './pages/MetricTypesPage'
import SettingsPage from './pages/SettingsPage'
import ReportsPage from './pages/ReportsPage'
import PlayersDirectoryPage from './pages/PlayersDirectoryPage'
import MyProfilePage from './pages/MyProfilePage'
import TeamStaffPage from './pages/TeamStaffPage'
import { useAuthStore } from './context/AuthContext'
import { canManageUsers, canViewDirectoryPlayers, hasPermission, isPlayerRole } from './utils/permissions'

function ProtectedRoute({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

function AdminOnlyRoute({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (!canManageUsers(user?.role)) return <Navigate to="/dashboard" replace />
  return children
}

function PermissionRoute({ permission, children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (!hasPermission(user?.role, permission)) return <Navigate to="/dashboard" replace />
  return children
}

function ReportsRoute({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  const ok =
    hasPermission(user?.role, 'export_data') ||
    hasPermission(user?.role, 'generate_medical_reports') ||
    hasPermission(user?.role, 'generate_analytical_reports')
  if (!ok) return <Navigate to="/dashboard" replace />
  return children
}

function PlayersDirectoryRoute({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (!canViewDirectoryPlayers(user?.role)) return <Navigate to="/dashboard" replace />
  return children
}

function PlayerProfileRoute({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (!isPlayerRole(user?.role)) return <Navigate to="/dashboard" replace />
  return children
}

function AssignCoachRoute({ children }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (!hasPermission(user?.role, 'assign_team_coaches')) return <Navigate to="/dashboard" replace />
  return children
}

function DefaultRedirect() {
  const { token } = useAuthStore()
  return <Navigate to={token ? '/dashboard' : '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/team/:teamId/players" element={<ProtectedRoute><TeamPlayersPage /></ProtectedRoute>} />
          <Route path="/dashboard/team/:teamId/players/:playerId" element={<ProtectedRoute><PlayerDetailPage /></ProtectedRoute>} />
          <Route path="/dashboard/player/:playerId" element={<ProtectedRoute><PlayerDetailPage /></ProtectedRoute>} />
          <Route path="/dashboard/team/:teamId/staff" element={<AssignCoachRoute><TeamStaffPage /></AssignCoachRoute>} />
          <Route path="/players-directory" element={<PlayersDirectoryRoute><PlayersDirectoryPage /></PlayersDirectoryRoute>} />
          <Route path="/my-profile" element={<PlayerProfileRoute><MyProfilePage /></PlayerProfileRoute>} />
          <Route path="/my-metrics" element={<ProtectedRoute><MyMetricsPage /></ProtectedRoute>} />
          <Route path="/users" element={<AdminOnlyRoute><UsersPage /></AdminOnlyRoute>} />
          <Route path="/metric-types" element={<PermissionRoute permission="manage_metric_types"><MetricTypesPage /></PermissionRoute>} />
          <Route path="/settings" element={<PermissionRoute permission="manage_settings"><SettingsPage /></PermissionRoute>} />
          <Route path="/reports" element={<ReportsRoute><ReportsPage /></ReportsRoute>} />
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
