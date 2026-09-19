import { ArrowDown, Bot, MessagesSquare, UserCog } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import styles from './AISection.module.css'

const AGENTS = [
  {
    icon: MessagesSquare,
    title: 'Sales Agent',
    text: 'Communicates with leads, extracts requirements and updates records.',
  },
  {
    icon: UserCog,
    title: 'Project Manager Agent',
    text: 'Answers questions about projects, stages, deadlines and required actions.',
  },
  {
    icon: Bot,
    title: 'Client Agent',
    text: 'Combines stable organizational knowledge with live project data.',
  },
]

export function AISection() {
  return (
    <section className={styles.section} id="ai" aria-labelledby="ai-heading">
      <div className="container">
        <div className={styles.header}>
          <span className={styles.eyebrow}>AI Agents</span>
          <h2 id="ai-heading" className={styles.heading}>
            AI doesn't just answer. It works.
          </h2>
        </div>

        <div className={styles.layout}>
          <div className={styles.cards}>
            {AGENTS.map((agent) => {
              const Icon = agent.icon
              return (
                <Card key={agent.title}>
                  <div className={styles.iconWrap} aria-hidden="true">
                    <Icon size={22} />
                  </div>
                  <h3 className={styles.cardTitle}>{agent.title}</h3>
                  <p className={styles.cardText}>{agent.text}</p>
                </Card>
              )
            })}
          </div>

          <div
            className={styles.diagram}
            role="img"
            aria-label="Diagram: RAG and Airtable feed AI Agents, which produce a Business Action."
          >
            <div className={styles.diagramRow}>
              <span className={styles.diagramNode}>RAG</span>
              <span className={styles.diagramNode}>Airtable</span>
            </div>
            <ArrowDown size={20} aria-hidden="true" color="var(--text-secondary)" />
            <span className={`${styles.diagramNode} ${styles.diagramNodeAccent}`}>AI Agents</span>
            <ArrowDown size={20} aria-hidden="true" color="var(--text-secondary)" />
            <span className={`${styles.diagramNode} ${styles.diagramNodeAccentSoft}`}>Business Action</span>
          </div>
        </div>
      </div>
    </section>
  )
}
