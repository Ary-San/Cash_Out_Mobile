// SecureStore es nativo: en las pruebas se reemplaza por un mapa en memoria.
jest.mock("expo-secure-store", () => {
  const store = new Map()
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    getItemAsync: async (key) => store.get(key) ?? null,
    setItemAsync: async (key, value) => void store.set(key, value),
    deleteItemAsync: async (key) => void store.delete(key),
  }
})
