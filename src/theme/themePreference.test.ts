import { act, renderHook } from "@testing-library/react-native"
import { Appearance } from "react-native"
import * as SecureStore from "expo-secure-store"
import { colorScheme } from "nativewind"
import { applyStoredTheme, useThemePreference } from "@/theme/themePreference"

jest.mock("nativewind", () => ({ colorScheme: { set: jest.fn() } }))

const setScheme = colorScheme.set as jest.Mock

describe("themePreference", () => {
  beforeEach(() => setScheme.mockClear())

  it("sin nada guardado, o con algo raro, sigue al sistema", () => {
    jest.spyOn(Appearance, "getColorScheme").mockReturnValue("dark")
    applyStoredTheme()
    expect(setScheme).toHaveBeenLastCalledWith("dark")

    SecureStore.setItem("cashout.theme", "morado")
    applyStoredTheme()
    expect(setScheme).toHaveBeenLastCalledWith("dark")
  })

  it("elegir un tema lo aplica y lo recuerda al volver a abrir", async () => {
    const { result } = await renderHook(() => useThemePreference())

    await act(() => result.current[1]("dark"))
    expect(result.current[0]).toBe("dark")
    expect(setScheme).toHaveBeenLastCalledWith("dark")

    applyStoredTheme()
    expect(setScheme).toHaveBeenLastCalledWith("dark")
  })
})
