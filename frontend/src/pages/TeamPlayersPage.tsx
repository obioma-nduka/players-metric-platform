import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { getPlayers, getTeams, createPlayer, updatePlayer } from '@/api'
import { canManageTeamRoster, canManageUsers } from '@/utils/permissions'

interface Player {
  player_id: string | null
  user_id?: string | null
  first_name: string
  last_name: string
  position?: string | null
  jersey_number?: number | null
  height_cm?: number | null
  weight_kg?: number | null
  team_name?: string
  is_active: number
}

export default function TeamPlayersPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { token, user } = useAuthStore()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>([])
  const [teamName, setTeamName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createErr, setCreateErr] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newPl, setNewPl] = useState({ first_name: '', last_name: '', position: '', jersey_number: '' })

  useEffect(() => {
    document.title = `${teamName || "Team"} Roster | Players Metrics Platform`;
  }, [teamName]);

  const refetch = async () => {
    if (!teamId) return
    const res = await getPlayers(teamId)
    const list = Array.isArray(res.data) ? res.data : []
    setPlayers(list)
    const first = list[0] as Player | undefined
    if (first?.team_name) setTeamName(first.team_name)
    else {
      const teamsRes = await getTeams()
      const teams = Array.isArray(teamsRes.data) ? teamsRes.data : []
      const t = teams.find((row: { team_id: string; name?: string }) => row.team_id === teamId)
      setTeamName(t?.name || 'Team')
    }
  }

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    if (!teamId) {
      navigate('/dashboard', { replace: true })
      return
    }
    const fetchPlayers = async () => {
      try {
        setLoading(true)
        setError(null)
        await refetch()
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load players'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchPlayers()
  }, [token, teamId, navigate])

  if (!token) return null

  const removePlayerFromTeam = async (pid: string) => {
    if (!window.confirm('Remove this player from the team?')) return
    setError(null)
    try {
      await updatePlayer(pid, { team_id: null })
      await refetch()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Remove failed')
    }
  }

  const handleCreatePlayer = async (e: FormEvent) => {
    e.preventDefault()
    if (!teamId || !newPl.first_name.trim() || !newPl.last_name.trim()) return
    setCreateErr(null)
    setCreating(true)
    try {
      await createPlayer({
        team_id: teamId,
        first_name: newPl.first_name.trim(),
        last_name: newPl.last_name.trim(),
        position: newPl.position.trim() || undefined,
        jersey_number: newPl.jersey_number ? parseInt(newPl.jersey_number, 10) : undefined,
      })
      setNewPl({ first_name: '', last_name: '', position: '', jersey_number: '' })
      await refetch()
    } catch (err: unknown) {
      setCreateErr((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to="/dashboard" style={{ fontSize: '0.875rem' }}>← Back to Dashboard</Link>
      </p>
      <h1 className="platform-page-title">Players — {teamName}</h1>
      <p className="platform-page-subtitle">Roster from player profiles and users assigned to this team.</p>

      {canManageTeamRoster(user?.role) && teamId && (
        <div className="platform-card" style={{ marginBottom: '1rem' }}>
          <div className="platform-card-header">Add player</div>
          {createErr && <p style={{ margin: '0 1.25rem', fontSize: '0.875rem', color: 'var(--platform-danger)' }}>{createErr}</p>}
          <form onSubmit={handleCreatePlayer} style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
            <input className="platform-input" placeholder="First name *" value={newPl.first_name} onChange={(e) => setNewPl((p) => ({ ...p, first_name: e.target.value }))} required />
            <input className="platform-input" placeholder="Last name *" value={newPl.last_name} onChange={(e) => setNewPl((p) => ({ ...p, last_name: e.target.value }))} required />
            <input className="platform-input" placeholder="Position" value={newPl.position} onChange={(e) => setNewPl((p) => ({ ...p, position: e.target.value }))} />
            <input className="platform-input" type="number" placeholder="#" value={newPl.jersey_number} onChange={(e) => setNewPl((p) => ({ ...p, jersey_number: e.target.value }))} />
            <button type="submit" className="platform-btn platform-btn-primary" disabled={creating}>{creating ? 'Saving…' : 'Create player'}</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="platform-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--platform-text-muted)' }}>
          Loading players...
        </div>
      ) : error ? (
        <div className="platform-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--platform-danger)' }}>{error}</p>
          <Link to="/dashboard" className="platform-btn platform-btn-secondary" style={{ display: 'inline-block', marginTop: '1rem' }}>
            Back to Dashboard
          </Link>
        </div>
      ) : players.length === 0 ? (
        <div className="platform-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--platform-text-muted)' }}>
          <p style={{ margin: '0 0 0.75rem', lineHeight: 1.5 }}>
            Nobody is on this roster yet. It shows <strong>player</strong> records for this team and <strong>users</strong> whose team is set to this team.
          </p>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
            With an empty <strong>players</strong> table and no users assigned to this team, the list stays empty until you add at least one of those.
          </p>
          {canManageUsers(user?.role) && (
            <Link to="/users" className="platform-btn platform-btn-primary" style={{ display: 'inline-block', marginBottom: '0.75rem' }}>
              Open User Management
            </Link>
          )}
          <div>
            <Link to="/dashboard" style={{ fontSize: '0.875rem' }}>Back to Dashboard</Link>
          </div>
        </div>
      ) : (
        <div className="platform-card">
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {players.map((player) => (
              <li key={player.player_id ?? player.user_id ?? `${player.first_name}-${player.last_name}`} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--platform-border)' }}>
                <p style={{ margin: 0, fontWeight: 500, color: 'var(--platform-text)' }}>
                  {player.player_id && teamId ? (
                    <Link to={`/dashboard/team/${teamId}/players/${player.player_id}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                      {player.first_name} {player.last_name}
                    </Link>
                  ) : (
                    <>{player.first_name} {player.last_name}</>
                  )}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
                  {player.position || '—'} • #{player.jersey_number ?? '—'}
                  {player.height_cm != null && ` • ${player.height_cm} cm`}
                  {player.weight_kg != null && ` • ${player.weight_kg} kg`}
                  {!player.player_id && ' • (no player profile — link a user in User Management)'}
                </p>
                {canManageTeamRoster(user?.role) && player.player_id && (
                  <button
                    type="button"
                    className="platform-btn platform-btn-secondary"
                    style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}
                    onClick={() => removePlayerFromTeam(player.player_id as string)}
                  >
                    Remove from team
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
