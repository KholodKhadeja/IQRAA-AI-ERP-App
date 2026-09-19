export type UserRole = 'Admin' | 'CEO' | 'VP' | 'ProjectManager' | 'Client'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface Credentials {
  email: string
  password: string
}

export interface AuthResult {
  user: AuthUser
  token: string
}
