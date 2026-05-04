import { createContext } from 'react'

import type { ApiUser, Session } from '../types'

export interface LoginResult {
  session: Session
  needsGuestImport: boolean
}

export interface AuthContextValue {
  session: Session | null
  loginWithPassword: (email: string, password: string) => Promise<LoginResult>
  signupWithPassword: (email: string, password: string, displayName: string) => Promise<ApiUser>
  continueAsGuest: () => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
