import { useState, type FormEvent } from 'react'
import { LoginError, login } from '../../lib/loginApi'

interface LoginPageProps {
  onAuthenticated: () => void
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [fullName, setFullName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!fullName.trim() || !pin.trim()) {
      setError('Enter your full name and PIN.')
      return
    }

    setIsSubmitting(true)
    try {
      await login({ fullName: fullName.trim(), pin })
      onAuthenticated()
    } catch (cause) {
      setError(
        cause instanceof LoginError
          ? cause.message
          : 'Unable to reach the authentication server',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand login-card__brand" aria-label="LateTrack">
          <span aria-hidden="true">
            <img className="brand__mark" src="/Logo.png" alt="" />
          </span>
          <span>
            <strong>LateTrack</strong>
            <small>Workforce attendance</small>
          </span>
        </div>
        <h1 id="login-title">Sign in to LateTrack</h1>
        <p className="login-card__intro">Use your employee name and PIN to continue.</p>

        {error ? (
          <div className="alert alert--error login-card__error" role="alert">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Full name</span>
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="John Mark Almiro"
              disabled={isSubmitting}
            />
          </label>
          <label className="login-field">
            <span>PIN</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="****"
              disabled={isSubmitting}
            />
          </label>
          <button className="button button--primary login-card__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}
