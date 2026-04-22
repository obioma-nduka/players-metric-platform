import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { assignCoachToTeam, getCoachCandidates, getTeamCoaches, getTeams } from '@/api'
import { canAssignTeamCoaches } from '@/utils/permissions'

type UserRow = { user_id: string; email: string; first_name?: string | null; last_name?: string | null; team_id?: string | null; team_name?: string | null }

export default function TeamStaffPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { token, user } = useAuthStore()
  const navigate = useNavigate()
  const [teamName, setTeamName] = useState('')
  const [current, setCurrent] = useState<UserRow[]>([])
  const [candidates, setCandidates] = useState<UserRow[]>([])
  const [selected, setSelected] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    document.title = `Assign Coaches: ${teamName || "Team"} | Players Metrics Platform`;
  }, [teamName]);

  const load = async () => {
    if (!teamId) return
    setLoading(true)
    setError(null)
    try {
      const [teamsRes, onTeam, pool] = await Promise.all([
        getTeams(),
        getTeamCoaches(teamId),
        getCoachCandidates(),
      ])
      const tlist = Array.isArray(teamsRes.data) ? teamsRes.data : []
      const t = tlist.find((x: { team_id: string }) => x.team_id === teamId)
      setTeamName(t?.name || 'Team')
      setCurrent(Array.isArray(onTeam.data) ? onTeam.data : [])
      setCandidates(Array.isArray(pool.data) ? pool.data : [])
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    if (!canAssignTeamCoaches(user?.role)) {
      navigate('/dashboard', { replace: true })
      return
    }
    if (!teamId) {
      navigate('/dashboard', { replace: true })
      return
    }
    load()
  }, [token, teamId, user?.role, navigate])

  const assign = async (e: FormEvent) => {
    e.preventDefault()
    if (!teamId || !selected) return
    setAssigning(true)
    setError(null)
    try {
      await assignCoachToTeam(teamId, selected)
      setSelected('')
      await load()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Assignment failed')
    } finally {
      setAssigning(false)
    }
  }

  if (!token) return null

  const label = (u: UserRow) =>
    `${[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email} (${u.email})${u.team_name ? ` — ${u.team_name}` : ''}`

  return (
    <div>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to="/dashboard" style={{ fontSize: '0.875rem' }}>← Dashboard</Link>
      </p>
      <h1 className="platform-page-title">Coaches — {teamName}</h1>
      <p className="platform-page-subtitle">
        Assign users who already have the <strong>coach</strong> role (set by an administrator under Users if needed).
      </p>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-danger)' }}>{error}</p>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--platform-text-muted)' }}>Loading…</p>
      ) : (
        <>
          <div className="platform-card" style={{ marginBottom: '1rem' }}>
            <div className="platform-card-header">Coaches on this team</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: '0.5rem 1.25rem 1rem' }}>
              {current.length === 0 ? (
                <li style={{ color: 'var(--platform-text-muted)' }}>No coaches assigned yet.</li>
              ) : (
                current.map((c) => (
                  <li key={c.user_id} style={{ padding: '0.35rem 0' }}>{label(c)}</li>
                ))
              )}
            </ul>
          </div>

          <div className="platform-card" style={{ padding: '1.25rem' }}>
            <div className="platform-card-header" style={{ margin: '-1.25rem -1.25rem 1rem', padding: '0.75rem 1.25rem' }}>
              Assign a coach
            </div>
            <form onSubmit={assign} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
              <select className="platform-input" style={{ minWidth: '260px' }} value={selected} onChange={(e) => setSelected(e.target.value)} required>
                <option value="">Select coach account</option>
                {candidates.map((c) => (
                  <option key={c.user_id} value={c.user_id}>{label(c)}</option>
                ))}
              </select>
              <button type="submit" className="platform-btn platform-btn-primary" disabled={assigning || !selected}>
                {assigning ? 'Assigning…' : 'Assign to team'}
              </button>
            </form>
          </div>

          <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
            <Link to={`/dashboard/team/${teamId}/players`}>← Team roster</Link>
          </p>
        </>
      )}
    </div>
  )
}
