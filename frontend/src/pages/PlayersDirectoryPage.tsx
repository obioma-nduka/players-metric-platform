import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { getPlayers, getTeams } from '@/api'

type Team = { team_id: string; name: string }
type PlayerRow = {
  player_id: string | null
  team_id?: string | null
  first_name: string
  last_name: string
  team_name?: string
}

export default function PlayersDirectoryPage() {
  const { token } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Players Directory | Players Metrics Platform'
  }, [])

  const [teams, setTeams] = useState<Team[]>([])
  const [filterTeam, setFilterTeam] = useState('')
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    getTeams()
      .then((r) => setTeams(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTeams([]))
  }, [token, navigate])

  useEffect(() => {
    if (!token) return
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getPlayers(filterTeam || undefined)
        const list = Array.isArray(res.data) ? res.data : []
        setPlayers(list.filter((p: PlayerRow) => p.player_id))
      } catch (err: unknown) {
        setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load players')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [token, filterTeam])

  if (!token) return null

  return (
    <div>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to="/dashboard" style={{ fontSize: '0.875rem' }}>← Dashboard</Link>
      </p>
      <h1 className="platform-page-title">Players directory</h1>
      <p className="platform-page-subtitle">Browse all players and filter by team. Open a profile to add or edit health records.</p>

      <div className="platform-card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <label className="platform-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Team</label>
        <select className="platform-input" style={{ maxWidth: '280px' }} value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.team_id} value={t.team_id}>{t.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <p style={{ color: 'var(--platform-danger)', marginBottom: '1rem' }}>{error}</p>
      )}

      <div className="platform-card">
        <div className="platform-card-header">Players</div>
        {loading ? (
          <p style={{ padding: '1.5rem', color: 'var(--platform-text-muted)' }}>Loading…</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {players.map((p) => (
              <li key={p.player_id as string} style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--platform-border)' }}>
                <Link
                  to={
                    p.team_id
                      ? `/dashboard/team/${p.team_id}/players/${p.player_id}`
                      : `/dashboard/player/${p.player_id}`
                  }
                  style={{ fontWeight: 500, color: 'inherit' }}
                >
                  {p.first_name} {p.last_name}
                </Link>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
                  {p.team_name || 'No team'}
                </span>
              </li>
            ))}
            {players.length === 0 && (
              <li style={{ padding: '1.5rem', color: 'var(--platform-text-muted)' }}>No players match this filter.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
