import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { tokenStore, type SessionEndReason } from "@/api/tokenStore"
import { authService } from "@/services/authService"
import { toApiError } from "@/api/errors"
import { isTwoFactorChallenge, type LoginRequest, type RegisterRequest, type Role, type User } from "@/types/auth"
import { AuthContext, type AuthContextValue, type AuthStatus } from "./authContext"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>("restoring")
  const [endReason, setEndReason] = useState<SessionEndReason | null>(null)
  const [attempt, setAttempt] = useState(0)
  // El segundo paso pendiente: la contrasena ya paso, falta el codigo.
  const [challenge, setChallenge] = useState<string | null>(null)

  useEffect(() => {
    return tokenStore.subscribe((event) => {
      if (event.type === "refreshed") {
        if (event.auth.user) setUser(event.auth.user)
        setStatus("authenticated")
        setEndReason(null)
      } else {
        setUser(null)
        setStatus("anonymous")
        setEndReason(event.reason)
      }
    })
  }, [])

  useEffect(() => {
    let active = true

    tokenStore.hydrate().then(() => {
      if (!active) return
      if (!tokenStore.getRefreshToken()) {
        setStatus("anonymous")
        return
      }
      authService.restore().catch((error: { status?: number }) => {
        if (!active) return
        if (error.status !== 401) setStatus("unavailable")
      })
    })

    return () => {
      active = false
    }
  }, [attempt])

  const login = useCallback(async (request: LoginRequest, signal?: AbortSignal) => {
    const auth = await authService.login(request, signal)
    if (isTwoFactorChallenge(auth)) {
      setChallenge(auth.twoFactorChallenge)
      return null
    }
    setChallenge(null)
    return auth.user
  }, [])

  const completeTwoFactor = useCallback(
    async (code: string) => {
      if (!challenge) throw new Error("No hay un inicio de sesión pendiente.")
      try {
        const auth = await authService.verifyTwoFactor(challenge, code)
        setChallenge(null)
        return auth.user
      } catch (err) {
        // Vencido o sin intentos: hay que volver a poner la contrasena.
        if (toApiError(err).serverMessage?.includes("venció")) setChallenge(null)
        throw err
      }
    },
    [challenge],
  )

  const cancelTwoFactor = useCallback(() => setChallenge(null), [])

  const register = useCallback(async (request: RegisterRequest, signal?: AbortSignal) => {
    const result = await authService.register(request, signal)
    // Con sesion abierta, Stack.Protected pasa solo al Resumen; si no, toca confirmar el correo.
    return { user: result.user, verificationRequired: "emailVerificationRequired" in result }
  }, [])

  const logout = useCallback(() => authService.logout(), [])

  const retryRestore = useCallback(() => {
    setStatus("restoring")
    setAttempt((n) => n + 1)
  }, [])

  const hasRole = useCallback((role: Role) => user?.roles.includes(role) ?? false, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      endReason,
      login,
      register,
      twoFactorChallenge: challenge,
      completeTwoFactor,
      cancelTwoFactor,
      logout,
      updateUser: setUser,
      retryRestore,
      hasRole,
    }),
    [status, user, endReason, login, register, challenge, completeTwoFactor, cancelTwoFactor, logout, retryRestore, hasRole],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
