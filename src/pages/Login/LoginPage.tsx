import { AlertCircle, ArrowLeft, Sparkles } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/TextField'
import { useAuth } from '../../hooks/useAuth'
import { getDashboardPathForRole } from '../../routes/roleRedirect'
import styles from './LoginPage.module.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const FLOW_STEPS = ['Lead', 'Proposal', 'Payment', 'Project', 'Production', 'Publication']

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error: authError } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)

  const emailError =
    emailTouched && email.length > 0 && !EMAIL_PATTERN.test(email)
      ? 'Enter a valid email address.'
      : emailTouched && email.length === 0
        ? 'Email is required.'
        : undefined

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEmailTouched(true)

    if (!EMAIL_PATTERN.test(email) || password.length === 0) {
      return
    }

    const user = await login({ email, password })
    if (user) {
      navigate(getDashboardPathForRole(user.role))
    }
  }

  return (
    <div className={styles.page}>
      <aside className={styles.brandPane}>
        <Link to="/" className={styles.brandLink}>
          <Sparkles size={20} aria-hidden="true" />
          AI Learning Operations ERP
        </Link>

        <div className={styles.brandContent}>
          <h2 className={styles.brandHeading}>From Lead to Published Learning Product.</h2>
          <p className={styles.brandText}>
            Sign in to track sales, projects, production and client approvals — all in one
            AI-powered workspace.
          </p>
          <div className={styles.flow}>
            {FLOW_STEPS.map((step) => (
              <span key={step} className={styles.flowStep}>
                {step}
              </span>
            ))}
          </div>
        </div>

        <span className={styles.brandFooter}>
          © {new Date().getFullYear()} AI Learning Operations ERP
        </span>
      </aside>

      <div className={styles.formPane}>
        <div className={styles.formCard}>
          <Link to="/" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back to home
          </Link>

          <div>
            <h1 className={styles.heading}>Welcome back</h1>
            <p className={styles.subheading}>Sign in to continue to your workspace.</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {authError && (
              <div className={styles.formError} role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                {authError}
              </div>
            )}

            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmailTouched(true)}
              error={emailError}
              required
            />

            <TextField
              label="Password"
              isPassword
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={passwordError}
              required
            />

            <div className={styles.formFooter}>
              <a href="#forgot-password" className={styles.forgotLink}>
                Forgot password?
              </a>
            </div>

            <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
