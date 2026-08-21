import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, isAuthenticated, clearToken } from '../services/api'
import ClippyAssistant from '../components/win98/ClippyAssistant'

function MemWaultVaultIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 16px auto', display: 'block', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
      <rect width="32" height="32" rx="8" fill="var(--ios-accent, #E89E38)" />
      {/* Outer Arch Vault */}
      <path d="M7 25V13C7 9.68629 9.68629 7 13 7H19C22.3137 7 25 9.68629 25 13V25" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      {/* Inner Vault Door Arch */}
      <path d="M11 25V16C11 14.3431 12.3431 13 14 13H18C19.6569 13 21 14.3431 21 16V25" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      {/* Keyhole */}
      <circle cx="16" cy="18" r="1.5" fill="#ffffff" />
      <path d="M16 19.5V22" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(() => isAuthenticated())
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ username: '', password: '' })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) {
      setAlreadyLoggedIn(true)
    }
  }, [])

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
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <MemWaultVaultIcon size={52} />
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

          {alreadyLoggedIn && (
            <div style={{
              background: 'rgba(52, 199, 89, 0.12)',
              border: '1px solid rgba(52, 199, 89, 0.3)',
              borderRadius: '16px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#34c759' }}>
                  ✓ Active Session Detected
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ios-text-secondary)' }}>
                  You are already logged in.
                </div>
              </div>
              <button
                type="button"
                className="ios-btn"
                onClick={() => navigate('/')}
                style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '10px' }}
              >
                Go to App →
              </button>
            </div>
          )}

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

      {/* ── Microsoft Office Assistant (Clippy) ── */}
      {alreadyLoggedIn && (
        <ClippyAssistant
          isOpen={alreadyLoggedIn}
          onClose={() => setAlreadyLoggedIn(false)}
          message="It looks like you are already logged in to MemWault! All your memories, archives, and settings are ready."
          primaryActionLabel="Go to Dashboard"
          onPrimaryAction={() => navigate('/')}
          secondaryActionLabel="Sign Out"
          onSecondaryAction={() => {
            clearToken();
            setAlreadyLoggedIn(false);
          }}
        />
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
