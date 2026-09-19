import { Bot, ClipboardCheck, TrendingUp, Users, Workflow } from 'lucide-react'
import type { ComponentType } from 'react'
import { Card } from '../../../components/ui/Card'
import styles from './PlatformOverview.module.css'

interface Feature {
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
  title: string
  flow: string
}

const FEATURES: Feature[] = [
  { icon: TrendingUp, title: 'Sales', flow: 'Lead → Qualified → Proposal' },
  { icon: ClipboardCheck, title: 'Projects', flow: 'Specification → Production → QA' },
  { icon: Users, title: 'Clients', flow: 'Review → Feedback → Approval' },
  { icon: Bot, title: 'AI', flow: 'Agents → RAG → Intelligent Actions' },
  { icon: Workflow, title: 'Automation', flow: 'n8n → Workflows → Notifications' },
]

export function PlatformOverview() {
  return (
    <section className={styles.section} id="solutions" aria-labelledby="platform-heading">
      <div className="container">
        <div className={styles.header}>
          <span className={styles.eyebrow}>Platform Overview</span>
          <h2 id="platform-heading" className={styles.heading}>
            One workflow. One source of truth.
          </h2>
        </div>

        <div className={styles.grid}>
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title}>
                <div className={styles.iconWrap} aria-hidden="true">
                  <Icon size={22} />
                </div>
                <h3 className={styles.cardTitle}>{feature.title}</h3>
                <p className={styles.flow}>{feature.flow}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
