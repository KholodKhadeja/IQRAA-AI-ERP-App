import type { AuthResult, Credentials } from '../../types/auth'
import { MockAuthProvider, type AuthProvider } from './authProvider'

/**
 * Single entry point the rest of the app talks to for authentication.
 * The active `AuthProvider` implementation is the only thing that changes
 * when a real identity backend is connected.
 */
class AuthService {
  private readonly provider: AuthProvider

  constructor(provider: AuthProvider) {
    this.provider = provider
  }

  login(credentials: Credentials): Promise<AuthResult> {
    return this.provider.login(credentials)
  }

  logout(): Promise<void> {
    return this.provider.logout()
  }

  getSession(): AuthResult | null {
    return this.provider.getSession()
  }
}

export const authService = new AuthService(new MockAuthProvider())
