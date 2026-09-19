import { Button } from '../../../components/ui/Button'
import styles from './CTASection.module.css'

export function CTASection() {
  return (
    <section className={styles.section} id="contact" aria-labelledby="cta-heading">
      <div className="container">
        <div className={styles.panel}>
          <h2 id="cta-heading" className={styles.heading}>
            Ready to connect your learning operation?
          </h2>
          <Button to="/login" variant="secondary">
            Talk to our team
          </Button>
        </div>
      </div>
    </section>
  )
}
