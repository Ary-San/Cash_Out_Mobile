import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { ApiError } from "@/api/errors"
import { inlineParts, replyBlocks, turnsToSend } from "@/lib/financeAssistant"
import { financeAssistantService } from "@/services/financeAssistantService"
import type { PlotSpec } from "@/types/financeAssistant"
import AssistantChatScreen from "../app/(app)/assistant-chat"

jest.mock("@/services/financeAssistantService", () => ({ financeAssistantService: { status: jest.fn(), chat: jest.fn() } }))
jest.mock("expo-router", () => ({ router: { back: jest.fn(), push: jest.fn() } }))

const api = financeAssistantService as jest.Mocked<typeof financeAssistantService>
const METRICS = { frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }
const wrap = () => (
  <SafeAreaProvider initialMetrics={METRICS}>
    <AssistantChatScreen />
  </SafeAreaProvider>
)
const donut: PlotSpec = {
  title: "Gastos de noviembre",
  description: "Comida se llevó el 75 %",
  data: [{ cat: "Comida", s: 300 }, { cat: "Transporte", s: 100 }],
  layers: [{ mark: "arc", encoding: { theta: { field: "s", unit: "PEN" }, color: { field: "cat" } } }],
}

beforeEach(() => {
  jest.clearAllMocks()
  api.status.mockResolvedValue({ available: true, remaining: 30 })
})

describe("asistente de finanzas: reglas", () => {
  it("lee el markdown simple de las respuestas: vinetas y negritas", () => {
    expect(replyBlocks("Este mes:\n- **Comida**: S/ 300\n2. Taxi")).toEqual([
      { kind: "paragraph", text: "Este mes:" },
      { kind: "bullet", text: "**Comida**: S/ 300" },
      { kind: "bullet", text: "Taxi" },
    ])
    expect(inlineParts("**Comida**: S/ 300")).toEqual([{ text: "Comida", bold: true }, { text: ": S/ 300", bold: false }])
  })

  it("manda los ultimos turnos y termina con la pregunta", () => {
    const history = Array.from({ length: 20 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: `t${i}` }))
    const sent = turnsToSend(history, "¿y hoy?")
    expect(sent).toHaveLength(16)
    expect(sent[sent.length - 1]).toEqual({ role: "user", content: "¿y hoy?" })
  })
})

describe("asistente de finanzas: pantalla", () => {
  it("una pregunta sugerida trae la respuesta con su grafico y descuenta el cupo", async () => {
    api.chat.mockResolvedValue({ reply: "Gastaste más en Comida: S/ 300.", remaining: 29, blocks: [{ kind: "text", markdown: "Gastaste más en **Comida**: S/ 300." }, { kind: "plot", id: "b1", spec: donut }] })
    await render(wrap())

    await fireEvent.press(await screen.findByText("¿En qué gasté más este mes?"))

    await waitFor(() => expect(api.chat).toHaveBeenCalledWith([{ role: "user", content: "¿En qué gasté más este mes?" }]))
    expect(await screen.findByText(/Gastaste más en/)).toBeTruthy()
    expect(screen.getByText("Gastos de noviembre")).toBeTruthy()
    expect(screen.getByText("Te quedan 29 preguntas hoy")).toBeTruthy()
  })

  it("si se acabo el cupo lo dice y devuelve la pregunta al campo", async () => {
    api.chat.mockRejectedValue(new ApiError({ kind: "http", status: 429 }))
    await render(wrap())

    await fireEvent.changeText(await screen.findByLabelText("Tu pregunta"), "¿cuánto ahorré?")
    await fireEvent.press(screen.getByLabelText("Enviar pregunta"))

    expect(await screen.findByText("Llegaste al límite de preguntas de hoy. Mañana puedes seguir.")).toBeTruthy()
    expect(screen.getByDisplayValue("¿cuánto ahorré?")).toBeTruthy()
  })

  it("sin la clave de Claude en el servidor avisa que no esta activo", async () => {
    api.status.mockResolvedValue({ available: false, remaining: 0 })
    await render(wrap())

    expect(await screen.findByText(/todavía no está activo/)).toBeTruthy()
    expect(screen.queryByText("¿En qué gasté más este mes?")).toBeNull()
  })
})

describe("asistente de finanzas: bloques", () => {
  it("una pregunta simple se responde solo con texto, sin bloques visuales", async () => {
    api.chat.mockResolvedValue({ reply: "Tienes S/ 1,392.50.", remaining: 29, blocks: [{ kind: "text", markdown: "Tienes **S/ 1,392.50**." }] })
    await render(wrap())
    await fireEvent.changeText(await screen.findByLabelText("Tu pregunta"), "¿cuánto tengo?")
    await fireEvent.press(screen.getByLabelText("Enviar pregunta"))
    expect(await screen.findByText("S/ 1,392.50")).toBeTruthy()
  })

  it("cifras, tabla, ranking, comparacion, linea de tiempo, consejo y plan se dibujan en orden", async () => {
    api.chat.mockResolvedValue({
      reply: "Resumen",
      remaining: 29,
      blocks: [
        { kind: "metrics", id: "b1", items: [{ label: "Gastaste", value: 305, unit: "PEN", delta: -0.26, deltaLabel: "vs octubre", higherIsGood: false }] },
        { kind: "table", id: "b2", columns: [{ key: "d", label: "Gasto" }, { key: "m", label: "Monto", unit: "PEN" }], rows: [{ d: "Zapatillas", m: 320 }, { d: "Chifa", m: 42.5 }] },
        { kind: "ranking", id: "b3", unit: "PEN", items: [{ label: "Comida", value: 160 }, { label: "Ocio", value: 60 }] },
        { kind: "comparison", id: "b4", left: { title: "Octubre", items: [{ label: "Gasto", value: 410, unit: "PEN" }] }, right: { title: "Noviembre", items: [{ label: "Gasto", value: 305, unit: "PEN" }] }, verdict: "Noviembre fue mejor." },
        { kind: "timeline", id: "b5", items: [{ date: "2026-11-02", title: "Compraste AAPL", tone: "gain" }, { date: "2026-11-20", title: "Vendiste BTC", tone: "loss" }] },
        { kind: "callout", id: "b6", tone: "tip", markdown: "Baja el **delivery**." },
        { kind: "steps", id: "b7", items: [{ title: "Separa S/ 100 cada quincena" }, { title: "Revisa el ocio" }] },
      ],
    })
    await render(wrap())
    await fireEvent.press(await screen.findByText("Compara mis últimos 3 meses"))

    expect(await screen.findByText(/−26 % vs octubre/)).toBeTruthy()
    expect(screen.getByText("Zapatillas")).toBeTruthy()
    expect(screen.getByText("Noviembre fue mejor.")).toBeTruthy()
    expect(screen.getByText("Compraste AAPL")).toBeTruthy()
    expect(screen.getByText("delivery")).toBeTruthy()
    expect(screen.getByText("Separa S/ 100 cada quincena")).toBeTruthy()
    // El lector de pantalla lee cada bloque completo.
    expect(screen.getByLabelText(/Gastaste: S\/\s305.*−26 % vs octubre/)).toBeTruthy()
  })
})

