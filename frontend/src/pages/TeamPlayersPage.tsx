import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { getPlayers } from '@/api'

interface Player {
  player_id: string
  first_name: string
  last_name: string
  position?: string
  jersey_number?: number
  height_cm?: number
  weight_kg?: number
  team_name?: string
  is_active: number
}

export default function TeamPlayersPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { token } = useAuthStore()
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>([])
  const [teamName, setTeamName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const res = await getPlayers(teamId)
        const list = Array.isArray(res.data) ? res.data : []
        setPlayers(list)
        const first = list[0] as Player | undefined
        if (first?.team_name) setTeamName(first.team_name)
        else setTeamName('Team')
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

  return (
    <div>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to="/dashboard" style={{ fontSize: '0.875rem' }}>← Back to Dashboard</Link>
      </p>
      <h1 className="platform-page-title">Players — {teamName}</h1>
      <p className="platform-page-subtitle">Roster for this team.</p>

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
        <div className="platform-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--platform-text-muted)' }}>
          <p style={{ margin: 0 }}>No players in this team yet.</p>
          <Link to="/dashboard" style={{ display: 'inline-block', marginTop: '0.75rem' }}>Back to Dashboard</Link>
        </div>
      ) : (
        <div className="platform-card">
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {players.map((player) => (
              <li key={player.player_id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--platform-border)' }}>
                <p style={{ margin: 0, fontWeight: 500, color: 'var(--platform-text)' }}>
                  {player.first_name} {player.last_name}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
                  {player.position || '—'} • #{player.jersey_number ?? '—'}
                  {player.height_cm != null && ` • ${player.height_cm} cm`}
                  {player.weight_kg != null && ` • ${player.weight_kg} kg`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
