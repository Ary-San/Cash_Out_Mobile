import { http } from "@/api/client"
import { tokenStore } from "@/api/tokenStore"
import type { AuthResponse } from "@/types/auth"

/** GET /users/me/2fa */
export interface TwoFactorStatus {
  /** false si el servidor no tiene TOTP_KEY: no se puede activar. */
  available: boolean
  enabled: boolean
  pending: boolean
  recoveryCodesLeft: number
}

/** Lo que se agrega a la app autenticadora: la clave a mano o el enlace otpauth://. */
export interface TwoFactorSetup {
  secret: string
  otpauthUri: string
}

export interface TwoFactorProof {
  password?: string
  code?: string
}

/** La verificacion en dos pasos de la cuenta propia. */
export const twoFactorService = {
  async status(signal?: AbortSignal): Promise<TwoFactorStatus> {
    const { data } = await http.get<TwoFactorStatus>("/users/me/2fa", { signal })
    return data
  },

  /** Paso 1: genera la clave (sin activarla). Pide la contrasena. */
  async setup(password: string): Promise<TwoFactorSetup> {
    const { data } = await http.post<TwoFactorSetup>("/users/me/2fa/setup", { password })
    return data
  },

  /**
   * Paso 2: el primer codigo la activa. El backend cierra todas las sesiones y
   * devuelve una nueva para este celular; los codigos de recuperacion se ven una vez.
   */
  async enable(code: string): Promise<string[]> {
    const { data } = await http.post<{ recoveryCodes: string[]; session: AuthResponse }>("/users/me/2fa/enable", { code })
    tokenStore.setSession(data.session)
    return data.recoveryCodes
  },

  async disable(proof: TwoFactorProof): Promise<void> {
    await http.post("/users/me/2fa/disable", proof)
  },

  async regenerate(code: string): Promise<string[]> {
    const { data } = await http.post<{ recoveryCodes: string[] }>("/users/me/2fa/recovery-codes", { code })
    return data.recoveryCodes
  },
}
