import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { getTeams, createTeam } from '@/api'
import { canManageUsers, canManageTeams } from '@/utils/permissions'

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
  const [createTeamError, setCreateTeamError] = useState<string | null>(null)
  const [createTeamLoading, setCreateTeamLoading] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', sport: '', league: '', country: '', founded_year: '' })

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

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    fetchTeams()
  }, [token, navigate])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeam.name.trim()) return
    setCreateTeamError(null)
    setCreateTeamLoading(true)
    try {
      await createTeam({
        name: newTeam.name.trim(),
        sport: newTeam.sport.trim() || undefined,
        league: newTeam.league.trim() || undefined,
        country: newTeam.country.trim() || undefined,
        founded_year: newTeam.founded_year ? parseInt(newTeam.founded_year, 10) : undefined,
      })
      setNewTeam({ name: '', sport: '', league: '', country: '', founded_year: '' })
      await fetchTeams()
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string } } })?.response
      setCreateTeamError(res?.data?.error || (res?.status === 403 ? 'Only admins can create teams.' : 'Failed to create team'))
    } finally {
      setCreateTeamLoading(false)
    }
  }

  if (!token) return null

  return (
    <div>
      <h1 className="platform-page-title">
        Welcome back, {user?.email?.split('@')[0] || 'User'}
      </h1>
      <p className="platform-page-subtitle">
        Overview of your teams and player data.
        {canManageUsers(user?.role) && ' Manage users in the Users section.'}
      </p>

      {canManageTeams(user?.role) && (
        <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
          <div className="platform-card-header">Create team</div>
          {createTeamError && (
            <p style={{ margin: '0 1.25rem 0.75rem', fontSize: '0.875rem', color: 'var(--platform-danger)' }}>{createTeamError}</p>
          )}
          <form onSubmit={handleCreateTeam} style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ minWidth: '160px' }}>
              <label htmlFor="team-name" className="platform-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Name *</label>
              <input
                id="team-name"
                type="text"
                value={newTeam.name}
                onChange={(e) => setNewTeam((t) => ({ ...t, name: e.target.value }))}
                className="platform-input"
                placeholder="Team name"
                required
              />
            </div>
            <div style={{ minWidth: '120px' }}>
              <label htmlFor="team-sport" className="platform-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Sport</label>
              <input
                id="team-sport"
                type="text"
                value={newTeam.sport}
                onChange={(e) => setNewTeam((t) => ({ ...t, sport: e.target.value }))}
                className="platform-input"
                placeholder="e.g. Football"
              />
            </div>
            <div style={{ minWidth: '120px' }}>
              <label htmlFor="team-league" className="platform-label" style={{ display: 'block', marginBottom: '0.25rem' }}>League</label>
              <input
                id="team-league"
                type="text"
                value={newTeam.league}
                onChange={(e) => setNewTeam((t) => ({ ...t, league: e.target.value }))}
                className="platform-input"
                placeholder="League"
              />
            </div>
            <div style={{ minWidth: '120px' }}>
              <label htmlFor="team-country" className="platform-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Country</label>
              <input
                id="team-country"
                type="text"
                value={newTeam.country}
                onChange={(e) => setNewTeam((t) => ({ ...t, country: e.target.value }))}
                className="platform-input"
                placeholder="Country"
              />
            </div>
            <div style={{ minWidth: '100px' }}>
              <label htmlFor="team-year" className="platform-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Founded</label>
              <input
                id="team-year"
                type="number"
                value={newTeam.founded_year}
                onChange={(e) => setNewTeam((t) => ({ ...t, founded_year: e.target.value }))}
                className="platform-input"
                placeholder="Year"
                min="1800"
                max="2100"
              />
            </div>
            <button type="submit" className="platform-btn platform-btn-primary" disabled={createTeamLoading || !newTeam.name.trim()}>
              {createTeamLoading ? 'Creating…' : 'Create team'}
            </button>
          </form>
        </div>
      )}

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
        {canManageUsers(user?.role) && (
          <div className="platform-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>Quick Actions</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
              <Link to="/users">Manage users</Link> to assign roles and teams.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
