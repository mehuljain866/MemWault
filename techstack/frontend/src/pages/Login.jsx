import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register } from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ username: '', password: '' })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (isRegister && form.password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      if (isRegister) {
        await register(form.username, form.password)
      }
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sv-login">
      <div className="sv-login__card sv-card sv-slide-up">
        {/* Logo */}
        <div className="sv-login__logo">
          <div className="sv-login__logo-icon">🏛️</div>
          <div className="sv-login__title">MemWault</div>
          <div className="sv-login__subtitle">
            Your portable memory archive
          </div>
        </div>

        {/* Form */}
        <form className="sv-login__form" onSubmit={handleSubmit}>
          {error && <div className="sv-login__error">{error}</div>}

          <div className="sv-login__field">
            <label className="sv-label" htmlFor="username">Username</label>
            <input
              id="username"
              className="sv-input"
              type="text"
              value={form.username}
              onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="Enter your username"
              required
              autoFocus
            />
          </div>

          <div className="sv-login__field">
            <label className="sv-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                className="sv-input"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required
                minLength={6}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--sv-text-muted)',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="sv-login__field" style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <label className="sv-label" htmlFor="confirmPassword">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  className="sv-input"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{ paddingRight: '40px' }}
                />
              </div>
            </div>
          )}

          <button
            className="sv-btn sv-btn--primary sv-btn--lg"
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: 'var(--sv-space-2)' }}
          >
            {loading
              ? '⏳ Please wait...'
              : isRegister
              ? '✨ Create Account'
              : '🔐 Sign In'
            }
          </button>
        </form>

        {/* Toggle register/login */}
        <div style={{
          textAlign: 'center',
          marginTop: 'var(--sv-space-6)',
          fontSize: 'var(--sv-text-sm)',
          color: 'var(--sv-text-tertiary)',
        }}>
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                className="sv-btn sv-btn--ghost"
                style={{ display: 'inline', padding: 0, fontSize: 'inherit', color: 'var(--sv-accent-primary)' }}
                onClick={() => { setIsRegister(false); setError('') }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              First time?{' '}
              <button
                className="sv-btn sv-btn--ghost"
                style={{ display: 'inline', padding: 0, fontSize: 'inherit', color: 'var(--sv-accent-primary)' }}
                onClick={() => { setIsRegister(true); setError('') }}
              >
                Create Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
