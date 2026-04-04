import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { getPlayerReadiness, getPlayerRecords } from '@/api'
import { isPlayerRole } from '@/utils/permissions'

export default function MyMetricsPage() {
  const { token, user, refreshMe } = useAuthStore()
  const navigate = useNavigate()
  const [readiness, setReadiness] = useState<Record<string, unknown> | null>(null)
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const playerId = user?.player_id

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    refreshMe()
  }, [token, navigate, refreshMe])

  useEffect(() => {
    if (!token || !playerId) {
      setLoading(false)
      return
    }
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const [rRes, recRes] = await Promise.all([
          getPlayerReadiness(playerId),
          getPlayerRecords(playerId, 100),
        ])
        setReadiness(rRes.data)
        setRecords(Array.isArray(recRes.data) ? recRes.data : [])
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        setError(msg || 'Failed to load your metrics')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [token, playerId])

  if (!token) return null

  if (!isPlayerRole(user?.role)) {
    return (
      <div>
        <p className="platform-page-subtitle">This page is for players.</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </div>
    )
  }

  if (!playerId) {
    return (
      <div className="platform-card" style={{ padding: '1.5rem' }}>
        <h1 className="platform-page-title">My metrics</h1>
        <p style={{ color: 'var(--platform-text-muted)', lineHeight: 1.5 }}>
          Your account is not linked to a player profile yet. Ask an administrator to assign a linked player in User Management.
        </p>
        <Link to="/dashboard" style={{ fontSize: '0.875rem' }}>← Dashboard</Link>
      </div>
    )
  }

  return (
    <div>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to="/dashboard" style={{ fontSize: '0.875rem' }}>← Dashboard</Link>
      </p>
      <h1 className="platform-page-title">My metrics</h1>
      <p className="platform-page-subtitle">
        Readiness and recent health metric entries.{' '}
        <Link to="/my-profile">Edit your player profile</Link>
      </p>

      {error && (
        <div className="platform-card" style={{ marginBottom: '1rem', padding: '1rem', borderLeft: '4px solid var(--platform-danger)' }}>
          <p style={{ margin: 0, color: 'var(--platform-danger)' }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="platform-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--platform-text-muted)' }}>Loading…</div>
      ) : (
        <>
          <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
            <div className="platform-card-header">Readiness (HRV RMSSD)</div>
            <div style={{ padding: '1rem 1.25rem' }}>
              {readiness && readiness.status !== 'unknown' ? (
                <p style={{ margin: 0 }}>
                  <strong>{String(readiness.status)}</strong>
                  {' — '}
                  latest {String(readiness.latest_rmssd)} ms at{' '}
                  {readiness.recorded_at ? new Date(String(readiness.recorded_at)).toLocaleString() : '—'}
                </p>
              ) : (
                <p style={{ margin: 0, color: 'var(--platform-text-muted)' }}>
                  {readiness && readiness.message ? String(readiness.message) : 'No readiness data yet.'}
                </p>
              )}
            </div>
          </div>

          <div className="platform-card">
            <div className="platform-card-header">Recent records</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {records.length === 0 ? (
                <li style={{ padding: '1.5rem', color: 'var(--platform-text-muted)' }}>No records yet.</li>
              ) : (
                records.map((row) => (
                  <li
                    key={String(row.record_id)}
                    style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--platform-border)' }}
                  >
                    <span style={{ fontWeight: 500 }}>{String(row.name)}</span>
                    {' '}
                    <span style={{ color: 'var(--platform-text-muted)', fontSize: '0.875rem' }}>
                      {row.recorded_at ? new Date(String(row.recorded_at)).toLocaleString() : ''}
                    </span>
                    <br />
                    <span style={{ fontSize: '0.875rem' }}>Value: {String(row.value)} {row.unit ? String(row.unit) : ''}</span>
                    {row.notes ? <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>{String(row.notes)}</p> : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
