import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../api'

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required')
      return
    }
    if (!form.email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match')
      return
    }
    if (!form.role) {
      setError('Please select a role')
      return
    }
    setLoading(true)
    try {
      await registerUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        team_id: null,
      })
      alert('Account created successfully! Please sign in.')
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-center">
      <div className="platform-card" style={{ padding: '2rem', maxWidth: '28rem' }}>
        <h2 className="platform-page-title" style={{ marginBottom: '0.25rem' }}>Create your account</h2>
        <p className="platform-page-subtitle" style={{ marginBottom: '1.5rem' }}>
          Join the Player Metrics Platform
        </p>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', borderLeft: '4px solid var(--platform-danger)', borderRadius: 'var(--platform-radius)' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-danger)' }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="first_name" className="platform-label">First name</label>
              <input id="first_name" name="first_name" type="text" autoComplete="given-name" required value={form.first_name} onChange={handleChange} className="platform-input" />
            </div>
            <div>
              <label htmlFor="last_name" className="platform-label">Last name</label>
              <input id="last_name" name="last_name" type="text" autoComplete="family-name" required value={form.last_name} onChange={handleChange} className="platform-input" />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="platform-label">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required value={form.email} onChange={handleChange} className="platform-input" />
          </div>
          <div>
            <label htmlFor="password" className="platform-label">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required value={form.password} onChange={handleChange} className="platform-input" />
          </div>
          <div>
            <label htmlFor="confirm_password" className="platform-label">Confirm password</label>
            <input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required value={form.confirm_password} onChange={handleChange} className="platform-input" />
          </div>
          {form.role === 'player' && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted, #64748b)', lineHeight: 1.5 }}>
              Players get a profile automatically. You cannot choose a team here — a head coach or coach will assign you after registration.
            </p>
          )}
          {(form.role === 'coach' || form.role === 'head_coach') && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted, #64748b)', lineHeight: 1.5 }}>
              You are not assigned to a team at sign-up. After you log in, use the dashboard to create your team and manage your roster. Coaches may only create one active team; head coaches can create multiple.
            </p>
          )}
          <div>
            <label htmlFor="role" className="platform-label">Role</label>
            <select id="role" name="role" value={form.role} onChange={handleChange} required className="platform-input">
              <option value="">Select your role</option>
              <option value="player">Player</option>
              <option value="medical_staff">Medical Staff</option>
              <option value="fitness_coach">Fitness Coach</option>
              <option value="coach">Coach</option>
              <option value="head_coach">Head Coach</option>
              <option value="performance_analyst">Performance Analyst</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="platform-btn platform-btn-primary" style={{ width: '100%', padding: '0.5rem 1rem' }}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', marginBottom: 0, fontSize: '0.875rem', color: 'var(--platform-text-muted)', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
