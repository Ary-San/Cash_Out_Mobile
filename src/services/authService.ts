import { api, http } from "@/api/client"
import { ApiError } from "@/api/errors"
import { tokenStore } from "@/api/tokenStore"
import { USE_MOCKS } from "@/config"
import type { AuthResponse, LoginRequest, PendingVerification, RegisterRequest } from "@/types/auth"

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
  async login(request: LoginRequest, signal?: AbortSignal): Promise<AuthResponse> {
    if (USE_MOCKS) {
      if (request.email !== "admin@cashout.dev" || request.password !== "admin123") {
        throw new ApiError({ kind: "http", status: 401 })
      }
      tokenStore.setSession(MOCK_AUTH)
      return MOCK_AUTH
    }

    const { data } = await http.post<AuthResponse>("/auth/login", request, {
      skipAuthRefresh: true,
      signal,
    })
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