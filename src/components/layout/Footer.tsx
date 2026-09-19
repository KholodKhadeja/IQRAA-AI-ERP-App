import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brandBlock}>
          <span className={styles.brand}>AI Learning Operations ERP</span>
          <p className={styles.description}>
            From Lead to Published Learning Product — connected, automated and AI-powered with n8n.
          </p>
        </div>

        <div className={styles.columns}>
          <nav aria-label="Footer navigation">
            <h2 className={styles.columnTitle}>Navigation</h2>
            <ul className={styles.linkList}>
              <li>
                <a href="#solutions">Solutions</a>
              </li>
              <li>
                <a href="#products">Products</a>
              </li>
              <li>
                <a href="#ai">How It Works</a>
              </li>
              <li>
                <a href="#about">About</a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal and contact">
            <h2 className={styles.columnTitle}>Contact</h2>
            <ul className={styles.linkList}>
              <li>
                <a href="#contact">Talk to our team</a>
              </li>
              <li>
                <a href="#accessibility">Accessibility</a>
              </li>
              <li>
                <a href="#privacy">Privacy</a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="container">
        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} AI Learning Operations ERP. All rights reserved.</span>
          <span>Built for digital learning production.</span>
        </div>
      </div>
    </footer>
  )
}
