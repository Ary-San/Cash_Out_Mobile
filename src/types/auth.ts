export type Role = 'GUEST' | 'USER' | 'ADMIN'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'

/** UserResponse */
export interface User {
  id: number
  name: string
  email: string
  roles: Role[]
  status: UserStatus
  /** yyyy-MM-dd */
  birthDate: string | null
  createdAt: string
  avatarUpdatedAt?: string
  /** Entra solo con Google: no tiene contraseña que cambiar. */
  googleOnly?: boolean
  /** Pide el codigo de la app autenticadora al entrar. */
  twoFactorEnabled?: boolean
}

/** Respuesta de login, registro y refresh. */
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  /** Segundos. */
  expiresIn: number
  user: User
}

/**
 * La contrasena estaba bien, pero la cuenta tiene verificacion en dos pasos:
 * todavia no hay sesion, solo el desafio para mandar con el codigo.
 */
export interface TwoFactorChallenge {
  twoFactorRequired: true
  twoFactorChallenge: string
}

export function isTwoFactorChallenge(value: unknown): value is TwoFactorChallenge {
  return typeof value === "object" && value !== null && (value as TwoFactorChallenge).twoFactorRequired === true
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  /** yyyy-MM-dd */
  birthDate?: string
}

/** Respuesta del registro cuando el backend pide confirmar el correo antes de entrar. */
export interface PendingVerification {
  user: User
  emailVerificationRequired: true
}

export interface RegisterResult {
  user: User
  /** true: no se abrio sesion; hay que confirmar el correo con el enlace que llego. */
  verificationRequired: boolean
}

export interface UpdateUserRequest {
  name?: string
  birthDate?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  /** El codigo de la app autenticadora, si la cuenta tiene verificacion en dos pasos. */
  twoFactorCode?: string
}
