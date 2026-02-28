import { Link } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'

export default function Footer() {
  const year = new Date().getFullYear()
  const { token } = useAuthStore()

  return (
    <footer className="platform-footer">
      <div className="platform-container platform-footer-inner">
        <div className="platform-footer-links">
          {token && (
            <>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/users">Users</Link>
            </>
          )}
          <a href="/api/health" target="_blank" rel="noopener noreferrer">API Health</a>
        </div>
        <p className="platform-footer-copy">
          © {year} Player Metrics Platform. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
