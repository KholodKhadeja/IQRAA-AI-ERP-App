import type { AuthResult, Credentials } from '../../types/auth'

/**
 * Contract every authentication backend must satisfy.
 * Swap `MockAuthProvider` for a real provider (Airtable-backed, n8n webhook,
 * Google OAuth, etc.) without changing anything that calls `authService`.
 */
export interface AuthProvider {
  login(credentials: Credentials): Promise<AuthResult>
  logout(): Promise<void>
  getSession(): AuthResult | null
}

const SESSION_KEY = 'aiops-erp.session'

/**
 * Prototype-only provider. Resolves any well-formed credentials to a fixed
 * Admin user so routing/UI can be built before a real identity backend exists.
 * Never used to make real authorization decisions server-side.
 */
export class MockAuthProvider implements AuthProvider {
  async login({ email }: Credentials): Promise<AuthResult> {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const result: AuthResult = {
      user: {
        id: 'demo-user',
        name: email.split('@')[0] || 'Demo User',
        email,
        role: 'Admin',
      },
      token: 'demo-token',
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(result))
    return result
  }

  async logout(): Promise<void> {
    sessionStorage.removeItem(SESSION_KEY)
  }

  getSession(): AuthResult | null {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null

    try {
      return JSON.parse(raw) as AuthResult
    } catch {
      return null
    }
  }
}
