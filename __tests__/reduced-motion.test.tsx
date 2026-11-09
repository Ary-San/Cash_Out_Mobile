import { AccessibilityInfo } from "react-native"
import { act, render, renderHook, screen } from "@testing-library/react-native"
import { Celebration } from "@/components/goals/Celebration"
import { useReducedMotion } from "@/hooks/useReducedMotion"

let notify: (value: boolean) => void = () => {}

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true)
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_event, handler) => {
    notify = handler as (value: boolean) => void
    return { remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>
  })
})
afterEach(() => jest.restoreAllMocks())

describe("reducir movimiento", () => {
  it("lee el ajuste del celular y sigue sus cambios", async () => {
    const { result } = await renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
    await act(async () => notify(false))
    expect(result.current).toBe(false)
  })

  it("la celebracion de la meta no tira confeti, pero si muestra la meta cumplida", async () => {
    await render(<Celebration visible name="Laptop" target={1000} tokens={20} onClose={jest.fn()} />)
    expect(await screen.findByText("¡Meta cumplida!")).toBeTruthy()
    expect(screen.queryAllByTestId("confetti")).toHaveLength(0)
  })
})
