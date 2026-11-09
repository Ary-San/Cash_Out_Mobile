import NetInfo, { useNetInfo, type NetInfoState } from "@react-native-community/netinfo"

/** Con red mientras no se sepa lo contrario: al abrir, NetInfo todavia no sabe si hay internet. */
function isOnline(state: Pick<NetInfoState, "isConnected" | "isInternetReachable">) {
  return state.isConnected !== false && state.isInternetReachable !== false
}

export function useOnline() {
  return isOnline(useNetInfo())
}

/** Avisa cuando vuelve la red despues de haberse perdido. Devuelve la funcion para dejar de escuchar. */
export function onReconnect(callback: () => void) {
  let offline = false
  return NetInfo.addEventListener((state) => {
    const online = isOnline(state)
    if (online && offline) callback()
    offline = !online
  })
}
