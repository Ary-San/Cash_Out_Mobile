import { createContext } from 'react'
import type { SessionEndReason } from '@/api/tokenStore'
import type { LoginRequest, RegisterRequest, RegisterResult, Role, User } from '@/types/auth'

/** 'unavailable': hay sesion guardada pero el servidor no respondio*/
export type AuthStatus = 'restoring' | 'authenticated' | 'anonymous' | 'unavailable'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  endReason: SessionEndReason | null
  /** null si la cuenta pide el codigo de verificacion en dos pasos: queda en twoFactorChallenge. */
  login(request: LoginRequest, signal?: AbortSignal): Promise<User | null>
  /** El desafio pendiente del segundo paso, o null. */
  twoFactorChallenge: string | null
  /** Manda el codigo y abre la sesion. */
  completeTwoFactor(code: string): Promise<User>
  /** Vuelve al primer paso. */
  cancelTwoFactor(): void
  register(request: RegisterRequest, signal?: AbortSignal): Promise<RegisterResult>
  logout(): Promise<void>
  updateUser(user: User): void
  retryRestore(): void
  hasRole(role: Role): boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
