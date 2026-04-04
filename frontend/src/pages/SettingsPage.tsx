import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { getSettings, patchSettings } from '@/api'

export default function SettingsPage() {
  const { token } = useAuthStore()
  const [map, setMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!token) return
    const run = async () => {
      try {
        const res = await getSettings()
        setMap((res.data as Record<string, string>) || {})
      } catch (err: unknown) {
        setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [token])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      const res = await patchSettings(map)
      setMap((res.data as Record<string, string>) || {})
      setSaved(true)
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed')
    }
  }

  const keys = Object.keys(map).sort()

  return (
    <div>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to="/dashboard" style={{ fontSize: '0.875rem' }}>← Dashboard</Link>
      </p>
      <h1 className="platform-page-title">Platform settings</h1>
      <p className="platform-page-subtitle">Organization display strings (admin only).</p>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2' }}>
          <p style={{ margin: 0, color: 'var(--platform-danger)', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}
      {saved && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#ecfdf5' }}>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Saved.</p>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--platform-text-muted)' }}>Loading…</p>
      ) : (
        <form onSubmit={save} className="platform-card" style={{ padding: '1.25rem' }}>
          {keys.length === 0 ? (
            <p style={{ color: 'var(--platform-text-muted)' }}>No settings.</p>
          ) : (
            keys.map((k) => (
              <div key={k} style={{ marginBottom: '1rem' }}>
                <label className="platform-label" style={{ display: 'block', marginBottom: '0.25rem' }}>{k}</label>
                <input
                  className="platform-input"
                  style={{ width: '100%', maxWidth: '480px' }}
                  value={map[k] || ''}
                  onChange={(e) => setMap((m) => ({ ...m, [k]: e.target.value }))}
                />
              </div>
            ))
          )}
          <button type="submit" className="platform-btn platform-btn-primary">Save settings</button>
        </form>
      )}
    </div>
  )
}
