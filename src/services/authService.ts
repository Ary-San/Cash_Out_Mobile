import { api, http } from "@/api/client"
import { ApiError } from "@/api/errors"
import { tokenStore } from "@/api/tokenStore"
import { USE_MOCKS } from "@/config"
import { isTwoFactorChallenge, type AuthResponse, type LoginRequest, type PendingVerification, type RegisterRequest, type TwoFactorChallenge } from "@/types/auth"

const MOCK_AUTH: AuthResponse = {
  accessToken: "mock-access",
  refreshToken: "mock-refresh",
  tokenType: "Bearer",
  expiresIn: 3600,
  user: {
    id: 1,
    name: "Crashout",
    email: "admin@cashout.dev",
    roles: ["ADMIN", "USER"],
    status: "ACTIVE",
    birthDate: null,
    createdAt: new Date().toISOString(),
  },
}

export const authService = {
  /** Con verificacion en dos pasos devuelve el desafio y todavia no abre la sesion. */
  async login(request: LoginRequest, signal?: AbortSignal): Promise<AuthResponse | TwoFactorChallenge> {
    if (USE_MOCKS) {
      if (request.email !== "admin@cashout.dev" || request.password !== "admin123") {
        throw new ApiError({ kind: "http", status: 401 })
      }
      tokenStore.setSession(MOCK_AUTH)
      return MOCK_AUTH
    }

    const { data } = await http.post<AuthResponse | TwoFactorChallenge>("/auth/login", request, {
      skipAuthRefresh: true,
      signal,
    })
    if (!isTwoFactorChallenge(data)) tokenStore.setSession(data)
    return data
  },

  /** El segundo paso: el desafio y el codigo de la app (o uno de recuperacion). Abre la sesion. */
  async verifyTwoFactor(challenge: string, code: string, signal?: AbortSignal): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>("/auth/2fa/verify", { challenge, code }, { skipAuthRefresh: true, signal })
    tokenStore.setSession(data)
    return data
  },

  /** Si el backend pide confirmar el correo, no hay sesion todavia: solo se devuelve el usuario. */
  async register(request: RegisterRequest, signal?: AbortSignal): Promise<AuthResponse | PendingVerification> {
    const { data } = await http.post<AuthResponse | PendingVerification>("/auth/register", request, {
      skipAuthRefresh: true,
      signal,
    })
    if (!("emailVerificationRequired" in data)) tokenStore.setSession(data)
    return data
  },

  /** Vuelve a mandar el enlace de confirmacion. El backend responde igual exista o no el correo. */
  async resendVerification(email: string): Promise<void> {
    await http.post("/auth/resend-verification", { email }, { skipAuthRefresh: true })
  },

  restore(): Promise<AuthResponse> {
    if (USE_MOCKS && tokenStore.getRefreshToken() === "mock-refresh") {
      tokenStore.setSession(MOCK_AUTH)
      return Promise.resolve(MOCK_AUTH)
    }
    return api.refreshSession()
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStore.getRefreshToken()
    try {
      if (refreshToken && !USE_MOCKS) {
        await http.post("/auth/logout", { refreshToken }, { skipAuthRefresh: true })
      }
    } catch {
    } finally {
      tokenStore.clear("logout")
    }
  },
}