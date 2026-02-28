import { useEffect, useState } from 'react'
import { useAuthStore } from '@/context/AuthContext'
import { getUsers, updateUser } from '@/api'
import { getTeams } from '@/api'

interface UserRow {
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  team_id: string | null
  team_name: string | null
  is_active: number
  last_login: string | null
  created_at: string
}

interface Team {
  team_id: string
  name: string
}

const ROLES = [
  'player',
  'medical_staff',
  'fitness_coach',
  'coach',
  'head_coach',
  'performance_analyst',
]

export default function UsersPage() {
  const { token } = useAuthStore()
  const [users, setUsers] = useState<UserRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ role: string; team_id: string }>({ role: '', team_id: '' })

  const loadUsers = async () => {
    try {
      const res = await getUsers()
      setUsers(Array.isArray(res.data) ? res.data : [])
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      const res = await getTeams()
      setTeams(Array.isArray(res.data) ? res.data : [])
    } catch {
      setTeams([])
    }
  }

  useEffect(() => {
    if (!token) return
    loadUsers()
    loadTeams()
  }, [token])

  const startEdit = (u: UserRow) => {
    setEditingId(u.user_id)
    setEditForm({ role: u.role, team_id: u.team_id ?? '' })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async () => {
    if (!editingId) return
    try {
      await updateUser(editingId, {
        role: editForm.role,
        team_id: editForm.team_id || null,
      })
      await loadUsers()
      setEditingId(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Update failed'
      setError(msg)
    }
  }

  const toggleActive = async (u: UserRow) => {
    try {
      await updateUser(u.user_id, { is_active: u.is_active ? false : true })
      await loadUsers()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Update failed'
      setError(msg)
    }
  }

  if (!token) return null

  return (
    <div>
      <h1 className="platform-page-title">User Management</h1>
      <p className="platform-page-subtitle">View and manage platform users, roles, and team assignments.</p>

      {error && (
        <div className="platform-card" style={{ marginBottom: '1rem', padding: '1rem', borderLeft: '4px solid var(--platform-danger)' }}>
          <p style={{ margin: 0, color: 'var(--platform-danger)' }}>{error}</p>
        </div>
      )}

      <div className="platform-card">
        <div className="platform-card-header">Users</div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--platform-text-muted)' }}>
            Loading users...
          </div>
        ) : (
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id}>
                    <td>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td>{u.email}</td>
                    <td>
                      {editingId === u.user_id ? (
                        <select
                          className="platform-input"
                          value={editForm.role}
                          onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                          style={{ width: 'auto', minWidth: '140px' }}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        u.role
                      )}
                    </td>
                    <td>
                      {editingId === u.user_id ? (
                        <select
                          className="platform-input"
                          value={editForm.team_id}
                          onChange={(e) => setEditForm((f) => ({ ...f, team_id: e.target.value }))}
                          style={{ width: 'auto', minWidth: '160px' }}
                        >
                          <option value="">No team</option>
                          {teams.map((t) => (
                            <option key={t.team_id} value={t.team_id}>{t.name}</option>
                          ))}
                        </select>
                      ) : (
                        u.team_name ?? '—'
                      )}
                    </td>
                    <td>
                      <span className={`platform-badge ${u.is_active ? 'platform-badge-active' : 'platform-badge-inactive'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}</td>
                    <td>
                      {editingId === u.user_id ? (
                        <span style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button type="button" className="platform-btn platform-btn-primary" onClick={saveEdit}>Save</button>
                          <button type="button" className="platform-btn platform-btn-secondary" onClick={cancelEdit}>Cancel</button>
                        </span>
                      ) : (
                        <span style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button type="button" className="platform-btn platform-btn-secondary" onClick={() => startEdit(u)}>Edit</button>
                          <button type="button" className="platform-btn platform-btn-danger" onClick={() => toggleActive(u)}>
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && users.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--platform-text-muted)' }}>
            No users found.
          </div>
        )}
      </div>
    </div>
  )
}
