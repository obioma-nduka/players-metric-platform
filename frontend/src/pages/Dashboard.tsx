import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { getTeams } from '@/api'

interface Team {
  team_id: string
  name: string
  sport?: string
  league?: string
  country?: string
}

export default function Dashboard() {
  const { user, token } = useAuthStore()
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    const fetchTeams = async () => {
      try {
        setLoadingTeams(true)
        setError(null)
        const res = await getTeams()
        setTeams(res.data || [])
      } catch (err: unknown) {
        setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load teams')
      } finally {
        setLoadingTeams(false)
      }
    }
    fetchTeams()
  }, [token, navigate])

  if (!token) return null

  return (
    <div>
      <h1 className="platform-page-title">
        Welcome back, {user?.email?.split('@')[0] || 'User'}
      </h1>
      <p className="platform-page-subtitle">
        Overview of your teams and player data. Manage users in the Users section.
      </p>

      <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
        <div className="platform-card-header">Your Teams</div>
        {loadingTeams ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--platform-text-muted)' }}>
            Loading teams...
          </div>
        ) : error ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--platform-danger)' }}>
            <p style={{ margin: 0 }}>{error}</p>
            <button type="button" className="platform-btn platform-btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        ) : teams.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--platform-text-muted)' }}>
            <p style={{ margin: 0 }}>No teams found.</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>You may need to be assigned to a team by an administrator.</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {teams.map((team: Team) => (
              <li key={team.team_id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--platform-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 500, color: 'var(--platform-text)' }}>{team.name}</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
                      {team.sport || 'Football'} • {team.league || 'N/A'} • {team.country || 'N/A'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="platform-btn platform-btn-primary"
                    onClick={() => navigate(`/dashboard/team/${team.team_id}/players`)}
                  >
                    View Players
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <div className="platform-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>Recent Activity</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
            Coming soon: player readiness updates, alerts, etc.
          </p>
        </div>
        <div className="platform-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>Quick Actions</h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
            <Link to="/users">Manage users</Link> to assign roles and teams.
          </p>
        </div>
      </div>
    </div>
  )
}
