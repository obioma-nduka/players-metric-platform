import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/context/AuthContext'
import { getMetricsAll, createMetricType, updateMetricType } from '@/api'

type Metric = {
  metric_type_id: string
  code: string
  name: string
  unit?: string | null
  data_type: string
  min_value?: number | null
  max_value?: number | null
  normal_range_low?: number | null
  normal_range_high?: number | null
  description?: string | null
  is_active?: number
}

export default function MetricTypesPage() {
  const { token } = useAuthStore()
  const [rows, setRows] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newRow, setNewRow] = useState({
    code: '',
    name: '',
    unit: '',
    data_type: 'numeric',
    description: '',
  })

  const load = async () => {
    try {
      const res = await getMetricsAll()
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) load()
  }, [token])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createMetricType({
        code: newRow.code.trim(),
        name: newRow.name.trim(),
        data_type: newRow.data_type,
        unit: newRow.unit.trim() || undefined,
        description: newRow.description.trim() || undefined,
      })
      setNewRow({ code: '', name: '', unit: '', data_type: 'numeric', description: '' })
      await load()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Create failed')
    }
  }

  const toggleActive = async (m: Metric) => {
    setError(null)
    try {
      await updateMetricType(m.metric_type_id, { is_active: m.is_active ? 0 : 1 })
      await load()
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Update failed')
    }
  }

  return (
    <div>
      <p style={{ marginBottom: '0.5rem' }}>
        <Link to="/dashboard" style={{ fontSize: '0.875rem' }}>← Dashboard</Link>
      </p>
      <h1 className="platform-page-title">Metric types</h1>
      <p className="platform-page-subtitle">Define health metrics (admin only).</p>

      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', borderRadius: 'var(--platform-radius)' }}>
          <p style={{ margin: 0, color: 'var(--platform-danger)', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      <div className="platform-card" style={{ marginBottom: '1.5rem' }}>
        <div className="platform-card-header">Add metric type</div>
        <form onSubmit={add} style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-end' }}>
          <input className="platform-input" placeholder="code" required value={newRow.code} onChange={(e) => setNewRow((n) => ({ ...n, code: e.target.value }))} />
          <input className="platform-input" placeholder="name" required value={newRow.name} onChange={(e) => setNewRow((n) => ({ ...n, name: e.target.value }))} />
          <input className="platform-input" placeholder="unit" value={newRow.unit} onChange={(e) => setNewRow((n) => ({ ...n, unit: e.target.value }))} />
          <select className="platform-input" value={newRow.data_type} onChange={(e) => setNewRow((n) => ({ ...n, data_type: e.target.value }))}>
            <option value="numeric">numeric</option>
            <option value="integer">integer</option>
            <option value="text">text</option>
            <option value="boolean">boolean</option>
            <option value="json">json</option>
          </select>
          <input className="platform-input" placeholder="description" style={{ minWidth: '200px' }} value={newRow.description} onChange={(e) => setNewRow((n) => ({ ...n, description: e.target.value }))} />
          <button type="submit" className="platform-btn platform-btn-primary">Create</button>
        </form>
      </div>

      <div className="platform-card">
        <div className="platform-card-header">All types</div>
        {loading ? (
          <p style={{ padding: '1.5rem', color: 'var(--platform-text-muted)' }}>Loading…</p>
        ) : (
          <div className="platform-table-wrap">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.metric_type_id}>
                    <td>{m.code}</td>
                    <td>{m.name}</td>
                    <td>{m.data_type}</td>
                    <td>{m.is_active ? 'yes' : 'no'}</td>
                    <td>
                      <button type="button" className="platform-btn platform-btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => toggleActive(m)}>
                        {m.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
