/**
 * Placeholder for the AI Agents / RAG layer (Sales Agent, Project Manager
 * Agent, Client Agent). Reserves the call shape the UI will use to ask an
 * agent a question or hand it a task; no model or RAG store is wired up yet.
 */
export interface AiQuery {
  agent: 'sales' | 'project-manager' | 'client'
  prompt: string
  context?: Record<string, unknown>
}

export interface AiResponse {
  answer: string
}

export interface AiService {
  ask(query: AiQuery): Promise<AiResponse>
}

export const aiService: AiService = {
  async ask() {
    throw new Error('aiService.ask is not implemented yet')
  },
}
