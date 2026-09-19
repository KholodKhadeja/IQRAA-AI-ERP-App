/**
 * Placeholder for the Airtable integration (live business data: Leads,
 * Customers, Proposals, Payments, Projects, Tasks, Files, ...).
 * No requests are made yet — this only reserves the shape callers will use
 * once a backend/proxy exchanges these calls for real Airtable records.
 * Credentials must never live in the frontend; calls will route through a
 * server-side proxy (n8n or an API layer) that holds the Airtable API key.
 */
export interface AirtableService {
  getRecord<T>(table: string, id: string): Promise<T>
  listRecords<T>(table: string, params?: Record<string, unknown>): Promise<T[]>
}

export const airtableService: AirtableService = {
  async getRecord() {
    throw new Error('airtableService.getRecord is not implemented yet')
  },
  async listRecords() {
    throw new Error('airtableService.listRecords is not implemented yet')
  },
}
