import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { getTeams, createTeam, updateTeam } from '@/api'
import {
  canAddHealthRecords,
  canAssignTeamCoaches,
  canExportData,
  canGenerateAnalyticalReports,
  canGenerateMedicalReports,
  canManageMetricTypes,
  canManageSettings,
  canManageTeamRoster,
  canManageTeams,
  canManageUsers,
  canViewDirectoryPlayers,
  isPlayerRole,
} from '@/utils/permissions'

interface Team {
  team_id: string
  name: string
  sport?: string
  league?: string
  country?: string
  founded_year?: number | null
  is_active?: number
  player_count?: number
  created_by_user_id?: string | null
}

function RoleGettingStarted({ role }: { role?: string }) {
  const r = role || ''
  return (
    <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
      <div className="platform-card-header">Getting started</div>
      <div style={{ padding: '0 1.25rem 1.25rem', display: 'grid', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
        {r === 'admin' && (
          <p style={{ margin: 0 }}>
            You have full access. Use <Link to="/users">Users</Link> for roles and assignments, create or edit teams below, and open{' '}
            <Link to="/metric-types">Metric types</Link>, <Link to="/settings">Settings</Link>, <Link to="/reports">Reports</Link>, and export from the players directory or reports as needed.
          </p>
        )}
        {r === 'head_coach' && (
          <p style={{ margin: 0 }}>
            Create your organization’s teams here, open each team’s <strong>View players</strong> to build the roster, and use <strong>Assign coaches</strong> to attach assistant coaches. Use the navbar links for metrics, reports, and settings you are allowed to use.
          </p>
        )}
        {r === 'coach' && (
          <p style={{ margin: 0 }}>
            <strong>Step 1:</strong> Create your team with the form below (one team per coach account). <strong>Step 2:</strong> Open <strong>View players</strong> to add athletes and manage the roster. Your account is linked to that team automatically. If you still see another club from old data, ask an admin to clear your team assignment or use your new team only.
          </p>
        )}
        {(r === 'medical_staff' || r === 'fitness_coach') && (
          <p style={{ margin: 0 }}>
            Open the <Link to="/players-directory">Players directory</Link>, pick a team filter, then a player to add or edit health records. Use <Link to="/reports">Reports</Link> for medical summaries when available.
          </p>
        )}
        {r === 'performance_analyst' && (
          <p style={{ margin: 0 }}>
            Browse the <Link to="/players-directory">Players directory</Link> for metrics and history, open <Link to="/reports">Reports</Link> for analytical views, and export data where your role allows.
          </p>
        )}
        {r === 'player' && (
          <p style={{ margin: 0 }}>
            Complete <Link to="/my-profile">My profile</Link> and track your data under <Link to="/my-metrics">My metrics</Link>. Your team is assigned by staff; you cannot change it yourself.
          </p>
        )}
        {r && !['admin', 'head_coach', 'coach', 'medical_staff', 'fitness_coach', 'performance_analyst', 'player'].includes(r) && (
          <p style={{ margin: 0 }}>Use the navigation links for the tools available to your role.</p>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, token, refreshMe } = useAuthStore()
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createTeamError, setCreateTeamError] = useState<string | null>(null)
  const [createTeamLoading, setCreateTeamLoading] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', sport: '', league: '', country: '', founded_year: '' })
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editTeam, setEditTeam] = useState({ name: '', sport: '', league: '', country: '', founded_year: '', is_active: true })
  const [teamSaveError, setTeamSaveError] = useState<string | null>(null)

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
      if (user?.role === 'coach') {
        await refreshMe()
      }
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string } } })?.response
      setCreateTeamError(res?.data?.error || (res?.status === 403 ? 'You do not have permission to create teams.' : 'Failed to create team'))
    } finally {
      setCreateTeamLoading(false)
    }
  }

  const handleSaveTeam = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingTeamId || !editTeam.name.trim()) return
    setTeamSaveError(null)
    try {
      await updateTeam(editingTeamId, {
        name: editTeam.name.trim(),
        sport: editTeam.sport.trim() || undefined,
        league: editTeam.league.trim() || undefined,
        country: editTeam.country.trim() || undefined,
        founded_year: editTeam.founded_year ? parseInt(editTeam.founded_year, 10) : undefined,
        is_active: editTeam.is_active ? 1 : 0,
      })
      setEditingTeamId(null)
      await fetchTeams()
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { error?: string } } })?.response
      setTeamSaveError(res?.data?.error || 'Failed to update team')
    }
  }

  if (!token) return null

  const userCreatedTeam = teams.some((t) => t.created_by_user_id === user?.id)
  const showCreateTeamForm = canManageTeams(user?.role) && (user?.role !== 'coach' || !userCreatedTeam)

  return (
    <div>
      <h1 className="platform-page-title">
        Welcome back, {user?.email?.split('@')[0] || 'User'}
      </h1>
      <p className="platform-page-subtitle">
        Overview of your teams and player data.
        {canManageUsers(user?.role) && ' Manage users in the Users section.'}
        {isPlayerRole(user?.role) && user?.player_id && (
          <>
            {' '}
            <Link to="/my-metrics">Open My metrics</Link>
          </>
        )}
      </p>

      <RoleGettingStarted role={user?.role} />

      {showCreateTeamForm && (
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

      {editingTeamId && canManageTeams(user?.role) && (
        <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
          <div className="platform-card-header">Edit team</div>
          {teamSaveError && (
            <p style={{ margin: '0 1.25rem', fontSize: '0.875rem', color: 'var(--platform-danger)' }}>{teamSaveError}</p>
          )}
          <form onSubmit={handleSaveTeam} style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ minWidth: '160px' }}>
              <label className="platform-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Name *</label>
              <input className="platform-input" value={editTeam.name} onChange={(e) => setEditTeam((t) => ({ ...t, name: e.target.value }))} required />
            </div>
            <div style={{ minWidth: '120px' }}>
              <label className="platform-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Sport</label>
              <input className="platform-input" value={editTeam.sport} onChange={(e) => setEditTeam((t) => ({ ...t, sport: e.target.value }))} />
            </div>
            <div style={{ minWidth: '120px' }}>
              <label className="platform-label" style={{ display: 'block', marginBottom: '0.25rem' }}>League</label>
              <input className="platform-input" value={editTeam.league} onChange={(e) => setEditTeam((t) => ({ ...t, league: e.target.value }))} />
            </div>
            <div style={{ minWidth: '120px' }}>
              <label className="platform-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Country</label>
              <input className="platform-input" value={editTeam.country} onChange={(e) => setEditTeam((t) => ({ ...t, country: e.target.value }))} />
            </div>
            <div style={{ minWidth: '100px' }}>
              <label className="platform-label" style={{ display: 'block', marginBottom: '0.25rem' }}>Founded</label>
              <input type="number" className="platform-input" value={editTeam.founded_year} onChange={(e) => setEditTeam((t) => ({ ...t, founded_year: e.target.value }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={editTeam.is_active} onChange={(e) => setEditTeam((t) => ({ ...t, is_active: e.target.checked }))} />
              Active
            </label>
            <button type="submit" className="platform-btn platform-btn-primary">Save</button>
            <button type="button" className="platform-btn platform-btn-secondary" onClick={() => setEditingTeamId(null)}>Cancel</button>
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
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
              {user?.role === 'head_coach' || user?.role === 'coach'
                ? 'Create a team using the form above, then open it to add players.'
                : 'Ask an administrator or head coach to assign you to a team, or create a team if your role allows it.'}
            </p>
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
                      {' • '}
                      {Number(team.player_count) || 0} {Number(team.player_count) === 1 ? 'player' : 'players'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="platform-btn platform-btn-primary"
                      onClick={() => navigate(`/dashboard/team/${team.team_id}/players`)}
                    >
                      View Players
                    </button>
                    {canManageTeams(user?.role) &&
                      (user?.role === 'admin' || team.created_by_user_id === user?.id) && (
                      <button
                        type="button"
                        className="platform-btn platform-btn-secondary"
                        onClick={() => {
                          setEditingTeamId(team.team_id)
                          setEditTeam({
                            name: team.name,
                            sport: team.sport || '',
                            league: team.league || '',
                            country: team.country || '',
                            founded_year: team.founded_year != null ? String(team.founded_year) : '',
                            is_active: team.is_active !== 0,
                          })
                          setTeamSaveError(null)
                        }}
                      >
                        Edit team
                      </button>
                    )}
                    {canAssignTeamCoaches(user?.role) &&
                      (user?.role === 'admin' || team.created_by_user_id === user?.id) && (
                      <button
                        type="button"
                        className="platform-btn platform-btn-secondary"
                        onClick={() => navigate(`/dashboard/team/${team.team_id}/staff`)}
                      >
                        Assign coaches
                      </button>
                    )}
                  </div>
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
        {canManageTeamRoster(user?.role) && (user?.role === 'head_coach' || user?.role === 'coach') && (
          <div className="platform-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>Roster</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
              Pick a team under Your Teams and use <strong>View players</strong> to add or move players on your squad.
            </p>
          </div>
        )}
        {canViewDirectoryPlayers(user?.role) && (
          <div className="platform-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>Players directory</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
              <Link to="/players-directory">Browse all players by team</Link>
              {canAddHealthRecords(user?.role) ? ' and open records to update health metrics.' : '.'}
            </p>
          </div>
        )}
        {canGenerateMedicalReports(user?.role) && (
          <div className="platform-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>Medical reports</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
              <Link to="/reports">Open Reports</Link> for medical summaries and filters.
            </p>
          </div>
        )}
        {canGenerateAnalyticalReports(user?.role) && (
          <div className="platform-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>Analytics</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
              <Link to="/reports">Analytical reports</Link>
              {canExportData(user?.role) ? ' and export from the directory or reports flows.' : '.'}
            </p>
          </div>
        )}
        {canManageMetricTypes(user?.role) && (
          <div className="platform-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>Metric types</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
              <Link to="/metric-types">Configure metric types</Link> used across the platform.
            </p>
          </div>
        )}
        {canManageSettings(user?.role) && (
          <div className="platform-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600 }}>Settings</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
              <Link to="/settings">Organization settings</Link>
            </p>
          </div>
        )}
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
