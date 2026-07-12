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
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--ios-bg-app)',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        animation: 'slideUp 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
      }}>
        {/* Glass Card */}
        <div style={{
          background: 'var(--ios-bg-card)',
          borderRadius: '24px',
          padding: '48px 40px',
          boxShadow: 'var(--ios-shadow-lg)',
          border: '1px solid var(--ios-border)',
        }}>
          {/* Logo & Title */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              fontSize: '56px',
              marginBottom: '16px',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
            }}>🏛️</div>
            <div style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              color: 'var(--ios-text-primary)',
              marginBottom: '6px',
            }}>MemWault</div>
            <div style={{
              fontSize: '15px',
              color: 'var(--ios-text-secondary)',
              fontWeight: 400,
            }}>
              {isRegister ? 'Create your account' : 'Your portable memory archive'}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{
                background: 'rgba(255, 59, 48, 0.1)',
                border: '1px solid rgba(255, 59, 48, 0.3)',
                color: 'var(--ios-danger)',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            {/* Username */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--ios-text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="Enter your username"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'var(--ios-bg-app)',
                  border: '1.5px solid var(--ios-border)',
                  borderRadius: '12px',
                  fontSize: '16px',
                  color: 'var(--ios-text-primary)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--ios-accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--ios-border)'}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--ios-text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 16px',
                    background: 'var(--ios-bg-app)',
                    border: '1.5px solid var(--ios-border)',
                    borderRadius: '12px',
                    fontSize: '16px',
                    color: 'var(--ios-text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--ios-accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--ios-border)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '14px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'var(--ios-text-secondary)',
                    cursor: 'pointer', fontSize: '18px',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>
            </div>

            {/* Confirm Password (register only) */}
            {isRegister && (
              <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--ios-text-secondary)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'var(--ios-bg-app)',
                    border: '1.5px solid var(--ios-border)',
                    borderRadius: '12px',
                    fontSize: '16px',
                    color: 'var(--ios-text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--ios-accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--ios-border)'}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="ios-btn"
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 600,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading
                ? '⏳ Please wait...'
                : isRegister
                ? '✨ Create Account'
                : '🔐 Sign In'}
            </button>
          </form>

          {/* Toggle Register/Login */}
          <div style={{
            textAlign: 'center',
            marginTop: '28px',
            fontSize: '14px',
            color: 'var(--ios-text-secondary)',
          }}>
            {isRegister ? (
              <>
                Already have an account?{' '}
                <button
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--ios-accent)', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 600,
                    padding: '0', fontFamily: 'inherit',
                  }}
                  onClick={() => { setIsRegister(false); setError('') }}
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                First time?{' '}
                <button
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--ios-accent)', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 600,
                    padding: '0', fontFamily: 'inherit',
                  }}
                  onClick={() => { setIsRegister(true); setError('') }}
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: '13px',
          color: 'var(--ios-text-secondary)',
          opacity: 0.6,
        }}>
          MemWault · Your memories, forever yours.
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
