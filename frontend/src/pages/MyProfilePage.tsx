import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { getMyPlayerProfile, patchMyPlayerProfile } from '@/api'
import { isPlayerRole } from '@/utils/permissions'

export default function MyProfilePage() {
  const { token, user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    position: '',
    jersey_number: '',
    nationality: '',
    height_cm: '',
    weight_kg: '',
  })
  const [teamName, setTeamName] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    if (!isPlayerRole(user?.role)) {
      navigate('/dashboard', { replace: true })
      return
    }
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getMyPlayerProfile()
        const p = res.data as Record<string, unknown>
        setTeamName(p.team_name != null ? String(p.team_name) : null)
        setForm({
          first_name: String(p.first_name || ''),
          last_name: String(p.last_name || ''),
          date_of_birth: p.date_of_birth ? String(p.date_of_birth).slice(0, 10) : '',
          gender: String(p.gender || ''),
          position: String(p.position || ''),
          jersey_number: p.jersey_number != null ? String(p.jersey_number) : '',
          nationality: String(p.nationality || ''),
          height_cm: p.height_cm != null ? String(p.height_cm) : '',
          weight_kg: p.weight_kg != null ? String(p.weight_kg) : '',
        })
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        setError(msg || 'Could not load profile')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [token, user?.role, navigate])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      await patchMyPlayerProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender.trim() || undefined,
        position: form.position.trim() || undefined,
        jersey_number: form.jersey_number ? parseInt(form.jersey_number, 10) : undefined,
        nationality: form.nationality.trim() || undefined,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
      })
      setSaved(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Save failed')
    }
  }

  if (!token) return null

  return (
    <div>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to="/dashboard" style={{ fontSize: '0.875rem' }}>← Dashboard</Link>
      </p>
      <h1 className="platform-page-title">My player profile</h1>
      <p className="platform-page-subtitle">
        Update your details. Team assignment is set by your head coach or coach — not here.
      </p>

      {teamName && (
        <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
          Current team: <strong>{teamName}</strong>
        </p>
      )}
      {!teamName && !loading && (
        <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
          You are not assigned to a team yet. Complete your profile; a coach will assign you when ready.
        </p>
      )}

      {error && (
        <div className="platform-card" style={{ marginBottom: '1rem', padding: '1rem', borderLeft: '4px solid var(--platform-danger)' }}>
          <p style={{ margin: 0, color: 'var(--platform-danger)', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}
      {saved && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#ecfdf5', borderRadius: 'var(--platform-radius)' }}>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Profile saved.</p>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--platform-text-muted)' }}>Loading…</p>
      ) : (
        <form onSubmit={save} className="platform-card" style={{ padding: '1.25rem', maxWidth: '520px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input className="platform-input" placeholder="First name *" required value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
            <input className="platform-input" placeholder="Last name *" required value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
            <input className="platform-input" type="date" placeholder="Date of birth" value={form.date_of_birth} onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))} />
            <input className="platform-input" placeholder="Gender" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} />
            <input className="platform-input" placeholder="Position" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
            <input className="platform-input" type="number" placeholder="Jersey number" value={form.jersey_number} onChange={(e) => setForm((f) => ({ ...f, jersey_number: e.target.value }))} />
            <input className="platform-input" placeholder="Nationality" value={form.nationality} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} />
            <input className="platform-input" type="number" step="0.1" placeholder="Height (cm)" value={form.height_cm} onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))} />
            <input className="platform-input" type="number" step="0.1" placeholder="Weight (kg)" value={form.weight_kg} onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))} />
            <button type="submit" className="platform-btn platform-btn-primary">Save profile</button>
          </div>
        </form>
      )}
    </div>
  )
}
