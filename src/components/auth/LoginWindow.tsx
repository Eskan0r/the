import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'

export default function LoginWindow() {
  const { signIn, signUp } = useAuthStore()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    let err: string | null = null
    if (mode === 'signin') {
      err = await signIn(email, password)
    } else {
      if (!username.trim()) {
        setError('Username is required')
        setLoading(false)
        return
      }
      err = await signUp(email, password, username.trim())
    }

    if (err) setError(err)
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--bg-desktop)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'JetBrains Mono', monospace",
    }}>

      <div style={{
        width: 380,
        background: 'var(--bg-window)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
      }}>
        <div style={{
          height: 28,
          background: 'var(--bg-titlebar)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 12,
          paddingRight: 12,
        }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5555' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffaa00' }} />
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#44ff88' }} />
          </div>
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--text-secondary)',
            pointerEvents: 'none',
          }}>
            RonakOS - {mode === 'signin' ? 'sign in' : 'create account'}
          </div>
        </div>

        <div style={{ padding: '28px 28px 24px' }}>
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ color: 'var(--accent)', fontSize: 18, fontWeight: 700, letterSpacing: '0.06em' }}>
              ~/ronak
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 4 }}>
              {mode === 'signin' ? 'sign in to continue' : 'create your account'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <Field
                label="username"
                value={username}
                onChange={setUsername}
                onKeyDown={handleKeyDown}
                autoFocus={mode === 'signup'}
              />
            )}
            <Field
              label="email"
              type="email"
              value={email}
              onChange={setEmail}
              onKeyDown={handleKeyDown}
              autoFocus={mode === 'signin'}
            />
            <Field
              label="password"
              type="password"
              value={password}
              onChange={setPassword}
              onKeyDown={handleKeyDown}
            />
          </div>

          {error && (
            <div style={{
              marginTop: 12,
              fontSize: 11,
              color: 'var(--text-error)',
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              marginTop: 20,
              width: '100%',
              height: 34,
              background: loading ? 'transparent' : 'var(--accent)',
              border: `1px solid ${loading ? 'var(--border)' : 'var(--accent)'}`,
              borderRadius: 3,
              color: loading ? 'var(--text-secondary)' : '#000',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.05em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'working...' : mode === 'signin' ? 'sign in' : 'create account'}
          </button>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
            {mode === 'signin' ? "don't have an account? " : 'already have an account? '}
            <span
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
              style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {mode === 'signin' ? 'sign up' : 'sign in'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 10, color: '#333' }}>
        RonakOS 1.0.0
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, onKeyDown, type = 'text', autoFocus = false
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  type?: string
  autoFocus?: boolean
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 5, letterSpacing: '0.05em' }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        spellCheck={false}
        style={{
          width: '100%',
          height: 32,
          background: 'var(--bg-terminal)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
          fontSize: 12,
          padding: '0 10px',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}