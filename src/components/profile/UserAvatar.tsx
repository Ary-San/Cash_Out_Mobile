import { useEffect, useMemo, useState } from "react"
import { Image, Platform, View } from "react-native"
import { tokenStore } from "@/api/tokenStore"
import { Title } from "@/components/ui/Text"
import { API_URL } from "@/config"
import { useApiQuery } from "@/hooks/useApiQuery"
import { initials } from "@/lib/format"
import { userService } from "@/services/userService"
import type { User } from "@/types/auth"

interface UserAvatarProps {
  user: User
  size: number
  /** undefined: la foto guardada; null: sin foto (se va a quitar); texto: una foto recien elegida. */
  preview?: string | null
}

/** La foto de perfil o, si no hay, las iniciales. */
export function UserAvatar({ user, size, preview }: UserAvatarProps) {
  const saved = preview === undefined && Boolean(user.avatarUpdatedAt)
  const webUri = useWebAvatar(saved && Platform.OS === "web" ? (user.avatarUpdatedAt ?? null) : null)
  const [failed, setFailed] = useState<string | null>(null)

  let source: { uri: string; headers?: Record<string, string> } | null = null
  if (typeof preview === "string") source = { uri: preview }
  else if (saved && Platform.OS === "web") source = webUri ? { uri: webUri } : null
  else if (saved) {
    // En el celular la foto se pide con el token, como cualquier otra llamada.
    source = {
      uri: `${API_URL}/users/me/avatar?v=${encodeURIComponent(user.avatarUpdatedAt ?? "")}`,
      headers: { Authorization: `Bearer ${tokenStore.getAccessToken() ?? ""}` },
    }
  }
  const show = source && failed !== source.uri

  return (
    <View
      aria-hidden
      className="items-center justify-center overflow-hidden rounded-full bg-accent"
      style={{ width: size, height: size }}
    >
      {show ? (
        <Image source={source!} onError={() => setFailed(source!.uri)} style={{ width: size, height: size }} />
      ) : (
        <Title className="text-accent-ink" style={{ fontSize: size * 0.4 }}>{initials(user.name)}</Title>
      )}
    </View>
  )
}

/** En web la foto se descarga con la sesion y se muestra desde una URL local. */
function useWebAvatar(version: string | null): string | null {
  const blob = useApiQuery(["avatar", version], (signal) => (version ? userService.getAvatar(signal) : Promise.resolve(null)))
  const uri = useMemo(() => (blob.data ? URL.createObjectURL(blob.data) : null), [blob.data])
  // La URL local ocupa memoria hasta que se libera: se suelta al cambiar de foto o al salir.
  useEffect(() => () => {
    if (uri) URL.revokeObjectURL(uri)
  }, [uri])
  return version ? uri : null
}
