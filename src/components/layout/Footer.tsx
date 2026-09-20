import { Link } from "react-router-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import styles from "./Footer.module.css";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brandBlock}>
          <span className={styles.brand}>IQRAA Digital Learning</span>
          <p className={styles.description}>{t.footer.description}</p>
        </div>

        <div className={styles.columns}>
          <nav aria-label={t.footer.navTitle}>
            <h2 className={styles.columnTitle}>{t.footer.navTitle}</h2>
            <ul className={styles.linkList}>
              <li>
                <Link to="/#services">{t.footer.services}</Link>
              </li>
              <li>
                <Link to="/#process">{t.footer.process}</Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t.footer.contactTitle}>
            <h2 className={styles.columnTitle}>{t.footer.contactTitle}</h2>
            <ul className={styles.linkList}>
              <li>
                <Link to="/#contact">{t.footer.talkToUs}</Link>
              </li>
              <li>
                <Link to="/accessibility">{t.footer.accessibility}</Link>
              </li>
              <li>
                <Link to="/#contact">{t.footer.privacy}</Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="container">
        <div className={styles.bottom}>
          <span>
            © {new Date().getFullYear()} IQRAA Digital Learning LTD.{" "}
            {t.footer.rights}
          </span>
          <span>{t.footer.poweredBy}</span>
        </div>
      </div>
    </footer>
  );
}
