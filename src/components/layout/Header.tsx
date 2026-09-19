import { useState } from 'react'
import { Menu, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { MobileMenu, type NavItem } from '../navigation/MobileMenu'
import styles from './Header.module.css'

const NAV_ITEMS: NavItem[] = [
  { label: 'Solutions', href: '#solutions' },
  { label: 'Products', href: '#products' },
  { label: 'How It Works', href: '#ai' },
  { label: 'About', href: '#about' },
  { label: 'Contact', href: '#contact' },
]

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Sparkles size={18} />
          </span>
          AI Learning Operations ERP
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <ul className={styles.navList}>
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a href={item.href} className={styles.navLink}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <Button to="/login" variant="ghost">
            Login
          </Button>
          <Button to="/login" variant="primary">
            Talk to us
          </Button>
        </div>

        <button
          type="button"
          className={styles.menuButton}
          aria-label="Open menu"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsMenuOpen(true)}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>

      <div id="mobile-menu">
        <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} navItems={NAV_ITEMS} />
      </div>
    </header>
  )
}
