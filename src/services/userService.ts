import { Platform } from "react-native"
import { http } from "@/api/client"
import type { ChangePasswordRequest, UpdateUserRequest, User } from "@/types/auth"

/** Una foto elegida con expo-image-picker. */
export interface PickedPhoto {
  uri: string
  mimeType?: string | null
  fileName?: string | null
}

export const userService = {
  async updateMe(changes: UpdateUserRequest): Promise<User> {
    const { data } = await http.patch<User>("/users/me", changes)
    return data
  },

  /** Cierra todas las sesiones, tambien esta: despues hay que entrar de nuevo. */
  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await http.put("/users/me/password", request)
  },

  async deleteMe(): Promise<void> {
    await http.delete("/users/me")
  },

  async uploadAvatar(photo: PickedPhoto): Promise<User> {
    const type = photo.mimeType ?? "image/jpeg"
    const name = photo.fileName ?? `avatar.${type.split("/")[1] ?? "jpg"}`
    const body = new FormData()
    if (Platform.OS === "web") {
      // En web el picker devuelve una URL del navegador: se sube el archivo de verdad.
      body.append("file", await (await fetch(photo.uri)).blob(), name)
    } else {
      // React Native arma la parte del multipart a partir de uri, nombre y tipo.
      body.append("file", { uri: photo.uri, name, type } as unknown as Blob)
    }
    // Sin este Content-Type, axios convertiria el FormData en JSON.
    const { data } = await http.put<User>("/users/me/avatar", body, { headers: { "Content-Type": "multipart/form-data" } })
    return data
  },

  async removeAvatar(): Promise<User> {
    const { data } = await http.delete<User>("/users/me/avatar")
    return data
  },

  /** La foto pide sesion: en web no puede ir en un img con el token, se descarga. */
  async getAvatar(signal?: AbortSignal): Promise<Blob> {
    const { data } = await http.get<Blob>("/users/me/avatar", { responseType: "blob", signal })
    return data
  },
}
