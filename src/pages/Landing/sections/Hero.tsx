import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import styles from './Hero.module.css'

const STAGES = [
  { label: 'Specification', status: 'done' },
  { label: 'Script', status: 'done' },
  { label: 'Client Approval', status: 'done' },
  { label: 'Design', status: 'active' },
  { label: 'Production', status: 'upcoming' },
  { label: 'QA', status: 'upcoming' },
  { label: 'Publication', status: 'upcoming' },
] as const

export function Hero() {
  return (
    <section className={styles.hero} aria-label="Introduction">
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>
            <Sparkles size={14} aria-hidden="true" />
            AI-Powered Learning Operations
          </span>

          <h1 className={styles.headline}>From Lead to Published Learning Product.</h1>

          <p className={styles.subtext}>
            One intelligent platform connecting sales, projects, production, client
            approvals and AI-powered automation.
          </p>

          <div className={styles.ctaRow}>
            <Button to="/login" variant="primary" icon={<ArrowRight size={18} aria-hidden="true" />}>
              Explore the Platform
            </Button>
            <Button to="/login" variant="secondary" icon={<MessageCircle size={18} aria-hidden="true" />}>
              Talk to our team
            </Button>
          </div>
        </div>

        <div
          className={styles.visual}
          role="img"
          aria-label="Product dashboard preview showing the Leadership 2026 online course project at 64% progress, currently in the Design stage."
        >
          <div className={styles.visualHeader}>
            <span className={styles.projectTitle}>Leadership 2026 — Online Course</span>
            <span className={styles.aiBadge}>
              <span className={styles.aiDot} aria-hidden="true" />
              AI Assistant Active
            </span>
          </div>

          <div>
            <div className={styles.progressLabel}>
              <span>Overall progress</span>
              <span>64%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} />
            </div>
          </div>

          <div className={styles.stages}>
            {STAGES.map((stage) => (
              <span
                key={stage.label}
                className={[
                  styles.stage,
                  stage.status === 'done' ? styles.stageDone : '',
                  stage.status === 'active' ? styles.stageActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {stage.label}
              </span>
            ))}
          </div>

          <div className={styles.statusCards}>
            <div className={styles.statusCard}>
              <span className={styles.statusLabel}>Current stage</span>
              <span className={styles.statusValue}>Design</span>
            </div>
            <div className={styles.statusCard}>
              <span className={styles.statusLabel}>Next milestone</span>
              <span className={styles.statusValue}>Client Review</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
