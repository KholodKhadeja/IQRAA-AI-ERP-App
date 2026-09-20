import { LayoutDashboard, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import styles from './DashboardPlaceholder.module.css'

interface DashboardPlaceholderProps {
  roleLabel: string
  title: string
  description: ReactNode
}

export function DashboardPlaceholder({ roleLabel, title, description }: DashboardPlaceholderProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  async function handleSignOut() {
    await logout()
    navigate('/login')
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={`container ${styles.topBarInner}`}>
          <Link to="/" className={styles.brand}>
            <Sparkles size={18} aria-hidden="true" style={{ display: 'inline', marginInlineEnd: 8 }} />
            AI Learning Operations ERP
          </Link>
          <Button variant="secondary" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        <div className={styles.card}>
          <div className={styles.iconWrap} aria-hidden="true">
            <LayoutDashboard size={26} />
          </div>
          <span className={styles.roleTag}>{roleLabel}</span>
          <h1 className={styles.heading}>{title}</h1>
          <p className={styles.text}>{description}</p>
        </div>
      </main>
    </div>
  )
}
