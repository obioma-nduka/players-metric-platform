import { useEffect, useState, FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import {
  getPlayer,
  getMetrics,
  getPlayerRecords,
  getPlayerReadiness,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  listRecordAttachments,
  uploadRecordAttachment,
  downloadAttachmentFile,
  updatePlayer,
} from '@/api'
import {
  canAddHealthRecords,
  canEditHealthRecords,
  canManageTeamRoster,
  canViewAllMetrics,
  isPlayerRole,
} from '@/utils/permissions'

type MetricRow = {
  metric_type_id: string
  code: string
  name: string
  unit?: string | null
  data_type: string
}

type RecordRow = {
  record_id: string
  recorded_at: string
  value: string
  notes?: string | null
  code: string
  name: string
  unit?: string | null
}

type AttachmentRow = {
  attachment_id: string
  file_name: string
  mime_type?: string | null
  file_size_bytes?: number | null
}

export default function PlayerDetailPage() {
  const params = useParams<{ teamId?: string; playerId?: string }>()
  const teamId = params.teamId
  const playerId = params.playerId
  const { token, user } = useAuthStore()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [metrics, setMetrics] = useState<MetricRow[]>([])
  const [records, setRecords] = useState<RecordRow[]>([])
  const [readiness, setReadiness] = useState<Record<string, unknown> | null>(null)
  const [attachmentsByRecord, setAttachmentsByRecord] = useState<Record<string, AttachmentRow[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editProfile, setEditProfile] = useState({
    first_name: '',
    last_name: '',
    position: '',
    jersey_number: '',
    height_cm: '',
    weight_kg: '',
  })
  const [newRecord, setNewRecord] = useState({
    metric_type_id: '',
    recorded_at: new Date().toISOString().slice(0, 16),
    value: '',
    notes: '',
  })
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [editRecordForm, setEditRecordForm] = useState({ value: '', notes: '', recorded_at: '' })

  const load = async () => {
    if (!playerId) return
    setLoading(true)
    setError(null)
    try {
      const [pRes, recRes, readRes] = await Promise.all([
        getPlayer(playerId),
        getPlayerRecords(playerId, 200),
        getPlayerReadiness(playerId),
      ])
      setProfile(pRes.data)
      setEditProfile({
        first_name: String(pRes.data.first_name || ''),
        last_name: String(pRes.data.last_name || ''),
        position: String(pRes.data.position || ''),
        jersey_number: pRes.data.jersey_number != null ? String(pRes.data.jersey_number) : '',
        height_cm: pRes.data.height_cm != null ? String(pRes.data.height_cm) : '',
        weight_kg: pRes.data.weight_kg != null ? String(pRes.data.weight_kg) : '',
      })
      setRecords(Array.isArray(recRes.data) ? recRes.data : [])
      setReadiness(readRes.data)
      if (canViewAllMetrics(user?.role)) {
        const mRes = await getMetrics()
        setMetrics(Array.isArray(mRes.data) ? mRes.data : [])
      }
      const recs: RecordRow[] = Array.isArray(recRes.data) ? recRes.data : []
      const att: Record<string, AttachmentRow[]> = {}
      for (const r of recs.slice(0, 30)) {
        try {
          const ar = await listRecordAttachments(r.record_id)
          att[r.record_id] = Array.isArray(ar.data) ? ar.data : []
        } catch {
          att[r.record_id] = []
        }
      }
      setAttachmentsByRecord(att)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string }; status?: number } })?.response
      setError(msg?.data?.error || 'Failed to load player')
      if (msg?.status === 403 || msg?.status === 404) {
        setProfile(null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    if (isPlayerRole(user?.role)) {
      navigate('/my-metrics', { replace: true })
      return
    }
    if (!playerId) {
      navigate('/dashboard', { replace: true })
      return
    }
    load()
  }, [token, playerId, user?.role, navigate])

  const handleAddRecord = async (e: FormEvent) => {
    e.preventDefault()
    if (!playerId || !newRecord.metric_type_id || newRecord.value === '') return
    setError(null)
    try {
      await createHealthRecord({
        player_id: playerId,
        metric_type_id: newRecord.metric_type_id,
        recorded_at: new Date(newRecord.recorded_at).toISOString(),
        value: newRecord.value,
        notes: newRecord.notes.trim() || undefined,
      })
      setNewRecord((n) => ({ ...n, value: '', notes: '' }))
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Could not create record')
    }
  }

  const saveEditRecord = async () => {
    if (!editingRecordId) return
    setError(null)
    try {
      await updateHealthRecord(editingRecordId, {
        value: editRecordForm.value,
        notes: editRecordForm.notes || undefined,
        recorded_at: editRecordForm.recorded_at
          ? new Date(editRecordForm.recorded_at).toISOString()
          : undefined,
      })
      setEditingRecordId(null)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Update failed')
    }
  }

  const removeRecord = async (id: string) => {
    if (!window.confirm('Delete this record?')) return
    setError(null)
    try {
      await deleteHealthRecord(id)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Delete failed')
    }
  }

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!playerId || user?.role !== 'admin') return
    setError(null)
    try {
      await updatePlayer(playerId, {
        first_name: editProfile.first_name.trim(),
        last_name: editProfile.last_name.trim(),
        position: editProfile.position.trim() || undefined,
        jersey_number: editProfile.jersey_number ? parseInt(editProfile.jersey_number, 10) : undefined,
        height_cm: editProfile.height_cm ? parseFloat(editProfile.height_cm) : undefined,
        weight_kg: editProfile.weight_kg ? parseFloat(editProfile.weight_kg) : undefined,
      })
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Profile update failed')
    }
  }

  const removeFromTeam = async () => {
    if (!playerId || !profile?.team_id) return
    if (!window.confirm('Remove this player from the team? Their account stays linked; staff can assign a team again later.')) return
    setError(null)
    try {
      await updatePlayer(playerId, { team_id: null })
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Could not update roster')
    }
  }

  const onUpload = async (recordId: string, file: File | null) => {
    if (!file) return
    setError(null)
    try {
      await uploadRecordAttachment(recordId, file)
      await load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'Upload failed')
    }
  }

  if (!token) return null

  return (
    <div>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link
          to={teamId ? `/dashboard/team/${teamId}/players` : '/players-directory'}
          style={{ fontSize: '0.875rem' }}
        >
          ← {teamId ? 'Back to roster' : 'Back to players'}
        </Link>
      </p>

      {loading ? (
        <div className="platform-card" style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>
      ) : error && !profile ? (
        <div className="platform-card" style={{ padding: '1.5rem' }}>
          <p style={{ color: 'var(--platform-danger)' }}>{error}</p>
          <Link to="/dashboard">Dashboard</Link>
        </div>
      ) : profile ? (
        <>
          <h1 className="platform-page-title">
            {String(profile.first_name)} {String(profile.last_name)}
          </h1>
          <p className="platform-page-subtitle">
            {String(profile.position || '—')} • #{profile.jersey_number ?? '—'} • {String(profile.team_name || '')}
          </p>

          {error && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', borderRadius: 'var(--platform-radius)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-danger)' }}>{error}</p>
            </div>
          )}

          <div className="platform-card" style={{ marginBottom: '1rem' }}>
            <div className="platform-card-header">Readiness</div>
            <div style={{ padding: '1rem 1.25rem' }}>
              {readiness && readiness.status !== 'unknown' ? (
                <p style={{ margin: 0 }}>
                  <strong>{String(readiness.status)}</strong> — RMSSD {String(readiness.latest_rmssd)} ms
                </p>
              ) : (
                <p style={{ margin: 0, color: 'var(--platform-text-muted)' }}>No HRV readiness data.</p>
              )}
            </div>
          </div>

          {canManageTeamRoster(user?.role) && profile.team_id && (
            <div className="platform-card" style={{ marginBottom: '1rem' }}>
              <div className="platform-card-header">Roster</div>
              <div style={{ padding: '1rem 1.25rem' }}>
                <button type="button" className="platform-btn platform-btn-secondary" onClick={removeFromTeam}>
                  Remove from team
                </button>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: 'var(--platform-text-muted)' }}>
                  Team assignment is managed here by coaches and head coaches; players edit their own details under My profile.
                </p>
              </div>
            </div>
          )}

          {user?.role === 'admin' && (
            <div className="platform-card" style={{ marginBottom: '1rem' }}>
              <div className="platform-card-header">Edit profile (admin)</div>
              <form onSubmit={saveProfile} style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <input className="platform-input" placeholder="First name" value={editProfile.first_name} onChange={(e) => setEditProfile((p) => ({ ...p, first_name: e.target.value }))} required />
                <input className="platform-input" placeholder="Last name" value={editProfile.last_name} onChange={(e) => setEditProfile((p) => ({ ...p, last_name: e.target.value }))} required />
                <input className="platform-input" placeholder="Position" value={editProfile.position} onChange={(e) => setEditProfile((p) => ({ ...p, position: e.target.value }))} />
                <input className="platform-input" type="number" placeholder="#" value={editProfile.jersey_number} onChange={(e) => setEditProfile((p) => ({ ...p, jersey_number: e.target.value }))} />
                <input className="platform-input" type="number" placeholder="Height cm" value={editProfile.height_cm} onChange={(e) => setEditProfile((p) => ({ ...p, height_cm: e.target.value }))} />
                <input className="platform-input" type="number" placeholder="Weight kg" value={editProfile.weight_kg} onChange={(e) => setEditProfile((p) => ({ ...p, weight_kg: e.target.value }))} />
                <button type="submit" className="platform-btn platform-btn-primary">Save profile</button>
              </form>
            </div>
          )}

          {canAddHealthRecords(user?.role) && (
            <div className="platform-card" style={{ marginBottom: '1rem' }}>
              <div className="platform-card-header">Add health record</div>
              <form onSubmit={handleAddRecord} style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '420px' }}>
                <select
                  className="platform-input"
                  required
                  value={newRecord.metric_type_id}
                  onChange={(e) => setNewRecord((n) => ({ ...n, metric_type_id: e.target.value }))}
                >
                  <option value="">Metric type</option>
                  {metrics.map((m) => (
                    <option key={m.metric_type_id} value={m.metric_type_id}>{m.name} ({m.code})</option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  className="platform-input"
                  required
                  value={newRecord.recorded_at}
                  onChange={(e) => setNewRecord((n) => ({ ...n, recorded_at: e.target.value }))}
                />
                <input
                  className="platform-input"
                  placeholder="Value"
                  required
                  value={newRecord.value}
                  onChange={(e) => setNewRecord((n) => ({ ...n, value: e.target.value }))}
                />
                <input
                  className="platform-input"
                  placeholder="Notes (optional)"
                  value={newRecord.notes}
                  onChange={(e) => setNewRecord((n) => ({ ...n, notes: e.target.value }))}
                />
                <button type="submit" className="platform-btn platform-btn-primary">Save record</button>
              </form>
            </div>
          )}

          <div className="platform-card">
            <div className="platform-card-header">Records</div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {records.map((r) => (
                <li key={r.record_id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--platform-border)' }}>
                  {editingRecordId === r.record_id && canEditHealthRecords(user?.role) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
                      <input className="platform-input" value={editRecordForm.value} onChange={(e) => setEditRecordForm((f) => ({ ...f, value: e.target.value }))} />
                      <input className="platform-input" value={editRecordForm.notes} onChange={(e) => setEditRecordForm((f) => ({ ...f, notes: e.target.value }))} />
                      <input type="datetime-local" className="platform-input" value={editRecordForm.recorded_at} onChange={(e) => setEditRecordForm((f) => ({ ...f, recorded_at: e.target.value }))} />
                      <span style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="platform-btn platform-btn-primary" onClick={saveEditRecord}>Save</button>
                        <button type="button" className="platform-btn platform-btn-secondary" onClick={() => setEditingRecordId(null)}>Cancel</button>
                      </span>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontWeight: 500 }}>{r.name}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--platform-text-muted)' }}>
                        {new Date(r.recorded_at).toLocaleString()} — {r.value} {r.unit || ''}
                      </div>
                      {r.notes ? <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>{r.notes}</p> : null}
                      {(attachmentsByRecord[r.record_id] || []).map((a) => (
                        <p key={a.attachment_id} style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem' }}>
                          <button
                            type="button"
                            className="platform-btn platform-btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                            onClick={() => downloadAttachmentFile(a.attachment_id, a.file_name)}
                          >
                            Download {a.file_name}
                          </button>
                        </p>
                      ))}
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                        {canEditHealthRecords(user?.role) && (
                          <>
                            <button
                              type="button"
                              className="platform-btn platform-btn-secondary"
                              style={{ fontSize: '0.8125rem' }}
                              onClick={() => {
                                setEditingRecordId(r.record_id)
                                setEditRecordForm({
                                  value: r.value,
                                  notes: r.notes || '',
                                  recorded_at: r.recorded_at.slice(0, 16),
                                })
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="platform-btn platform-btn-danger"
                              style={{ fontSize: '0.8125rem' }}
                              onClick={() => removeRecord(r.record_id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {canAddHealthRecords(user?.role) && (
                          <label style={{ fontSize: '0.8125rem', cursor: 'pointer' }}>
                            <span className="platform-btn platform-btn-secondary" style={{ fontSize: '0.8125rem', display: 'inline-block' }}>Attach file</span>
                            <input type="file" style={{ display: 'none' }} onChange={(e) => onUpload(r.record_id, e.target.files?.[0] || null)} />
                          </label>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
              {records.length === 0 && (
                <li style={{ padding: '1.5rem', color: 'var(--platform-text-muted)' }}>No records.</li>
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  )
}
