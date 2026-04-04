import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import {
  canExportData,
  canGenerateAnalyticalReports,
  canGenerateMedicalReports,
  canManageMetricTypes,
  canManageSettings,
  canManageUsers,
  canViewDirectoryPlayers,
  isPlayerRole,
} from '@/utils/permissions'

export default function Navbar() {
  const { token, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const showUsers = canManageUsers(user?.role)
  const showSettings = canManageSettings(user?.role)
  const showMetrics = canManageMetricTypes(user?.role)
  const showReports =
    canExportData(user?.role) ||
    canGenerateMedicalReports(user?.role) ||
    canGenerateAnalyticalReports(user?.role)
  const showMyMetrics = isPlayerRole(user?.role)
  const showPlayersDirectory = canViewDirectoryPlayers(user?.role)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="platform-nav">
      <div className="platform-container platform-nav-inner">
        <Link to={token ? '/dashboard' : '/login'} className="platform-logo">
          Player Metrics
        </Link>
        <nav className="platform-nav-links">
          {token ? (
            <>
              <Link to="/dashboard">Dashboard</Link>
              {showPlayersDirectory && <Link to="/players-directory">Players</Link>}
              {showMyMetrics && (
                <>
                  <Link to="/my-profile">My profile</Link>
                  <Link to="/my-metrics">My metrics</Link>
                </>
              )}
              {showReports && <Link to="/reports">Reports</Link>}
              {showMetrics && <Link to="/metric-types">Metrics</Link>}
              {showSettings && <Link to="/settings">Settings</Link>}
              {showUsers && <Link to="/users">Users</Link>}
              <span className="platform-nav-user">{user?.email ?? 'User'}</span>
              <button type="button" onClick={handleLogout} className="platform-btn platform-btn-danger">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
