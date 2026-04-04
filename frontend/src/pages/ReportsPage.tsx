import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { getMedicalReport, getAnalyticalReport, exportData, getTeams } from '@/api'
import {
  canExportData,
  canGenerateAnalyticalReports,
  canGenerateMedicalReports,
} from '@/utils/permissions'

export default function ReportsPage() {
  const { token, user } = useAuthStore()
  const [medical, setMedical] = useState<unknown>(null)
  const [analytical, setAnalytical] = useState<unknown>(null)
  const [teams, setTeams] = useState<Array<{ team_id: string; name: string }>>([])
  const [teamId, setTeamId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getTeams().then((r) => setTeams(Array.isArray(r.data) ? r.data : [])).catch(() => setTeams([]))
  }, [token])

  const runMedical = async () => {
    if (!canGenerateMedicalReports(user?.role)) return
    setError(null)
    try {
      const res = await getMedicalReport({ team_id: teamId || undefined })
      setMedical(res.data)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Medical report failed')
    }
  }

  const runAnalytical = async () => {
    if (!canGenerateAnalyticalReports(user?.role)) return
    setError(null)
    try {
      const res = await getAnalyticalReport({ team_id: teamId || undefined })
      setAnalytical(res.data)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Analytical report failed')
    }
  }

  const dl = async (resource: string) => {
    if (!canExportData(user?.role)) return
    setError(null)
    try {
      const res = await exportData({ resource, format: 'csv', team_id: teamId || undefined })
      const blob = res.data as Blob
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${resource}_export.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Export failed')
    }
  }

  return (
    <div>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to="/dashboard" style={{ fontSize: '0.875rem' }}>← Dashboard</Link>
      </p>
      <h1 className="platform-page-title">Reports & export</h1>
      <p className="platform-page-subtitle">Run summaries and download CSV exports where permitted.</p>

      <div className="platform-card" style={{ marginBottom: '1rem', padding: '1rem 1.25rem' }}>
        <label className="platform-label" style={{ display: 'block', marginBottom: '0.35rem' }}>Filter by team (optional)</label>
        <select className="platform-input" style={{ maxWidth: '280px' }} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">All (or your scope)</option>
          {teams.map((t) => (
            <option key={t.team_id} value={t.team_id}>{t.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2' }}>
          <p style={{ margin: 0, color: 'var(--platform-danger)', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {canGenerateMedicalReports(user?.role) && (
        <div className="platform-card" style={{ marginBottom: '1rem' }}>
          <div className="platform-card-header">Medical summary</div>
          <div style={{ padding: '1rem 1.25rem' }}>
            <button type="button" className="platform-btn platform-btn-primary" onClick={runMedical} style={{ marginBottom: '0.75rem' }}>
              Generate JSON summary
            </button>
            {medical && (
              <pre style={{ margin: 0, fontSize: '0.75rem', overflow: 'auto', maxHeight: '320px', background: '#f8fafc', padding: '0.75rem', borderRadius: '4px' }}>
                {JSON.stringify(medical, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {canGenerateAnalyticalReports(user?.role) && (
        <div className="platform-card" style={{ marginBottom: '1rem' }}>
          <div className="platform-card-header">Team analytics</div>
          <div style={{ padding: '1rem 1.25rem' }}>
            <button type="button" className="platform-btn platform-btn-primary" onClick={runAnalytical} style={{ marginBottom: '0.75rem' }}>
              Generate JSON analytics
            </button>
            {analytical && (
              <pre style={{ margin: 0, fontSize: '0.75rem', overflow: 'auto', maxHeight: '320px', background: '#f8fafc', padding: '0.75rem', borderRadius: '4px' }}>
                {JSON.stringify(analytical, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {canExportData(user?.role) && (
        <div className="platform-card">
          <div className="platform-card-header">CSV export</div>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" className="platform-btn platform-btn-secondary" onClick={() => dl('health_records')}>
              Health records
            </button>
            <button type="button" className="platform-btn platform-btn-secondary" onClick={() => dl('players')}>
              Players
            </button>
            {user?.role === 'admin' && (
              <button type="button" className="platform-btn platform-btn-secondary" onClick={() => dl('users')}>
                Users
              </button>
            )}
          </div>
        </div>
      )}

      {!canGenerateMedicalReports(user?.role) &&
        !canGenerateAnalyticalReports(user?.role) &&
        !canExportData(user?.role) && (
          <p style={{ color: 'var(--platform-text-muted)' }}>You do not have report or export permissions.</p>
        )}
    </div>
  )
}
