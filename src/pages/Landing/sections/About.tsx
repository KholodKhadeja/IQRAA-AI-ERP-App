import styles from './About.module.css'

export function About() {
  return (
    <section className={styles.section} id="about" aria-labelledby="about-heading">
      <div className="container">
        <h2 id="about-heading" className="sr-only">
          About
        </h2>
        <p className={styles.statement}>
          Built for digital learning development companies —{' '}
          <span>from Lead to Published Learning Product</span>, connected, automated and
          AI-powered with n8n.
        </p>
      </div>
    </section>
  )
}
