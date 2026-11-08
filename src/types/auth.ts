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
}
