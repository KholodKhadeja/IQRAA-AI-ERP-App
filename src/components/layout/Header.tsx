import { useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import { Button } from "../ui/Button";
import { LanguageToggle } from "../ui/LanguageToggle";
import { MobileMenu } from "../navigation/MobileMenu";
import styles from "./Header.module.css";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useLanguage();

  const navItems = [
    { label: t.header.nav.services, href: "/#services" },
    { label: t.header.nav.process, href: "/#process" },
    { label: t.header.nav.contact, href: "/#contact" },
  ];

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <span className={styles.brandNames}>
            <span className={styles.brandCompany}>IQRAA Digital Learning</span>
            <span className={styles.brandProduct}>
              AI Learning Operations ERP
            </span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <ul className={styles.navList}>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link to={item.href} className={styles.navLink}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <LanguageToggle />
          <Button to="/login" variant="secondary">
            {t.header.login}
          </Button>
          <Button to="/login" variant="primary">
            {t.header.talkToUs}
          </Button>
        </div>

        <button
          type="button"
          className={styles.menuButton}
          aria-label={isMenuOpen ? t.header.closeMenu : t.header.openMenu}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        >
          {isMenuOpen ? (
            <X size={22} aria-hidden="true" />
          ) : (
            <Menu size={22} aria-hidden="true" />
          )}
        </button>
      </div>

      <div id="mobile-menu">
        <MobileMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          navItems={navItems}
        />
      </div>
    </header>
  );
}
