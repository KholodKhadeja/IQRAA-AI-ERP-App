import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Footer } from "../../components/layout/Footer";
import { Header } from "../../components/layout/Header";
import { useLanguage } from "../../i18n/LanguageContext";
import styles from "./AccessibilityPage.module.css";

const LAST_UPDATED = "20.09.2026";

export function AccessibilityPage() {
  const { t } = useLanguage();

  return (
    <>
      <Header />
      <main id="main-content">
        <section className={`container ${styles.page}`}>
          <Link to="/" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            {t.accessibilityPage.backLink}
          </Link>

          <h1 className={styles.title}>{t.accessibilityPage.title}</h1>
          <p className={styles.updated}>
            {t.accessibilityPage.updatedLabel} {LAST_UPDATED}
          </p>

          <p className={styles.intro}>{t.accessibilityPage.intro}</p>

          <article className={styles.block}>
            <h2>{t.accessibilityPage.standardHeading}</h2>
            <p>{t.accessibilityPage.standardBody}</p>
          </article>

          <article className={styles.block}>
            <h2>{t.accessibilityPage.featuresHeading}</h2>
            <p>{t.accessibilityPage.featuresBody}</p>
          </article>

          <article className={styles.block}>
            <h2>{t.accessibilityPage.limitationsHeading}</h2>
            <p>{t.accessibilityPage.limitationsBody}</p>
          </article>

          <article className={styles.block}>
            <h2>{t.accessibilityPage.contactHeading}</h2>
            <p>{t.accessibilityPage.contactBody}</p>
            <a href="mailto:accessibility@iqraa-learning.com" className={styles.contactLink}>
              <Mail size={16} aria-hidden="true" />
              {t.accessibilityPage.contactEmailLabel}: accessibility@iqraa-learning.com
            </a>
          </article>

          <article className={styles.block}>
            <h2>{t.accessibilityPage.complaintHeading}</h2>
            <p>{t.accessibilityPage.complaintBody}</p>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}
