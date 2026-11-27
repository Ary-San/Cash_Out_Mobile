import axios, {
  isAxiosError,
  type AxiosAdapter,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios"
import { Platform } from "react-native"
import * as Device from "expo-device"
import { API_URL } from "@/config"
import type { AuthResponse } from "@/types/auth"
import { ApiError, toApiError } from "./errors"
import { tokenStore } from "./tokenStore"

declare module "axios" {
  interface AxiosRequestConfig {
    /** En login/registro un 401 son credenciales incorrectas. */
    skipAuthRefresh?: boolean
  }
}

interface TrackedConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
  _sentToken?: string | null
}

export interface ApiClientOptions {
  baseURL: string
  timeoutMs?: number
  /** Solo para tests. */
  adapter?: AxiosAdapter
}

export interface ApiClient {
  http: AxiosInstance
  refreshSession(): Promise<AuthResponse>
}

export function createApiClient({ baseURL, timeoutMs = 15_000, adapter }: ApiClientOptions): ApiClient {
  const defaults = {
    baseURL,
    timeout: timeoutMs,
    // X-Cashout-Client: asi "Sesiones activas" dice "App Cash-Out en Android (Pixel 7)" y no "okhttp".
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-Cashout-Client": clientLabel() },
    adapter,
  }

  const http = axios.create(defaults)
  const bare = axios.create(defaults)

  let inFlight: Promise<AuthResponse> | null = null

  async function performRefresh(): Promise<AuthResponse> {
    const refreshToken = tokenStore.getRefreshToken()
    if (!refreshToken) {
      throw new ApiError({ kind: "http", status: 401, serverMessage: "No hay una sesión activa." })
    }

    try {
      const { data } = await bare.post<AuthResponse>("/auth/refresh", { refreshToken })
      tokenStore.setSession(data)
      return data
    } catch (error) {
      const apiError = toApiError(error)
      if (apiError.status === 401) tokenStore.clear("expired")
      throw apiError
    }
  }

  function refreshSession(): Promise<AuthResponse> {
    inFlight ??= performRefresh().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  http.interceptors.request.use((config: TrackedConfig) => {
    const token = tokenStore.getAccessToken()
    config._sentToken = token
    if (token) config.headers.set("Authorization", `Bearer ${token}`)
    return config
  })

  http.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!isAxiosError(error) || error.response?.status !== 401) {
        throw toApiError(error)
      }

      const config = error.config as TrackedConfig | undefined
      if (!config || config._retried || config.skipAuthRefresh) {
        throw toApiError(error)
      }
      config._retried = true

      const current = tokenStore.getAccessToken()
      if (current && current !== config._sentToken) {
        return http(config)
      }

      if (tokenStore.getRefreshToken() === null) {
        throw toApiError(error)
      }

      try {
        await refreshSession()
      } catch {
        throw toApiError(error)
      }
      return http(config)
    },
  )

  return { http, refreshSession }
}

export const api = createApiClient({ baseURL: API_URL })

export const http = api.http

/** "android; Pixel 7": el sistema y el modelo, para nombrar la sesion. Sin datos personales. */
function clientLabel(): string {
  const model = (Device.modelName ?? "").replace(/[^\w .()-]/g, "").slice(0, 40)
  return `${Platform.OS}; ${model}`.trim()
}
