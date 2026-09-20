import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import { Button } from "../ui/Button";
import { LanguageToggle } from "../ui/LanguageToggle";
import styles from "./MobileMenu.module.css";

export interface NavItem {
  label: string;
  href: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
}

export function MobileMenu({ isOpen, onClose, navItems }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;

    firstLinkRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t.mobileMenu.ariaLabel}
      >
        <div className={styles.panelHeader}>
          <span className={styles.brand}>IQRAA Digital Learning</span>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t.header.closeMenu}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label={t.mobileMenu.navAriaLabel}>
          <ul className={styles.navList}>
            {navItems.map((item, index) => (
              <li key={item.href}>
                <Link
                  ref={index === 0 ? firstLinkRef : undefined}
                  to={item.href}
                  className={styles.navLink}
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <div className={styles.langRow}>
            <LanguageToggle />
          </div>
          <Button to="/login" variant="secondary" fullWidth onClick={onClose}>
            {t.header.login}
          </Button>
          <Button to="/login" variant="primary" fullWidth onClick={onClose}>
            {t.header.talkToUs}
          </Button>
        </div>
      </div>
    </div>
  );
}
