/**
 * Placeholder for triggering n8n workflows (automation/orchestration) from
 * the UI — e.g. creating a Lead, requesting a Proposal, or notifying a PM.
 * Reserves the call shape only; no webhook is wired up in this phase.
 */
export interface N8nService {
  triggerWorkflow<TPayload, TResponse>(
    workflowId: string,
    payload: TPayload,
  ): Promise<TResponse>
}

export const n8nService: N8nService = {
  async triggerWorkflow() {
    throw new Error('n8nService.triggerWorkflow is not implemented yet')
  },
}
