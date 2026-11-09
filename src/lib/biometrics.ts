import { useState } from "react"
import { Platform } from "react-native"
import * as LocalAuthentication from "expo-local-authentication"
import * as SecureStore from "expo-secure-store"

const KEY = "cashout.biometrics"

export interface BiometricSupport {
  available: boolean
  /** "huella", "rostro" o "huella o rostro": para los textos. */
  label: string
  /** Por que no se puede usar, en palabras del usuario. */
  reason?: string
}

/** Si el celular tiene lector y ya hay una huella o un rostro registrado. */
export async function biometricSupport(): Promise<BiometricSupport> {
  if (Platform.OS === "web") return { available: false, label: "huella", reason: "La vista web no tiene lector de huella." }
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ])
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    const label = face && finger ? "huella o rostro" : face ? "rostro" : "huella"
    if (!hardware) return { available: false, label, reason: "Tu celular no tiene lector de huella ni reconocimiento facial." }
    if (!enrolled) return { available: false, label, reason: `Primero registra tu ${label} en los ajustes del celular.` }
    return { available: true, label }
  } catch {
    return { available: false, label: "huella", reason: "No pudimos revisar el lector de huella." }
  }
}

/** Pide la huella o el rostro; si no hay, el sistema ofrece el PIN del celular. */
export async function authenticate(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: "Cancelar", disableDeviceFallback: false })
    return result.success
  } catch {
    return false
  }
}

/** En la web no hay SecureStore: ahi la biometria queda apagada. */
export function isBiometricsEnabled(): boolean {
  try {
    return SecureStore.getItem(KEY) === "on"
  } catch {
    return false
  }
}

function save(on: boolean): void {
  try {
    if (on) SecureStore.setItem(KEY, "on")
    else void SecureStore.deleteItemAsync(KEY)
  } catch {
    // Sin almacenamiento seguro la preferencia dura hasta cerrar la app.
  }
}

export function useBiometricsPreference(): [boolean, (on: boolean) => void] {
  const [enabled, setEnabled] = useState(isBiometricsEnabled)
  const set = (on: boolean) => {
    save(on)
    setEnabled(on)
  }
  return [enabled, set]
}

/**
 * Para acciones delicadas (una orden, eliminar la cuenta): si la biometria esta
 * activa pide la huella; si no, deja pasar como antes.
 */
export async function confirmWithBiometrics(promptMessage: string): Promise<boolean> {
  if (!isBiometricsEnabled()) return true
  return authenticate(promptMessage)
}
