import { fireEvent, render, screen } from "@testing-library/react-native"
import { arcPath, buildPlot, evalWhen, nearestSlot, niceTicks, pickAt, plotHeight, plotSummary, smoothPath } from "@/lib/plot"
import { PlotView } from "@/components/financeAssistant/PlotView"
import type { PlotSpec } from "@/types/financeAssistant"

jest.mock("@/lib/haptics", () => ({ haptics: { selection: jest.fn(), success: jest.fn(), warning: jest.fn() } }))

const stacked: PlotSpec = {
  title: "Gasto por mes",
  description: "Noviembre fue el mes más barato",
  data: [
    { mes: "Oct", cat: "Comida", s: 220 },
    { mes: "Oct", cat: "Ocio", s: 90 },
    { mes: "Nov", cat: "Comida", s: 160 },
    { mes: "Nov", cat: "Ocio", s: 60 },
  ],
  layers: [{ mark: "bar", encoding: { x: { field: "mes", type: "category" }, y: { field: "s", type: "quantitative" }, color: { field: "cat" } } }],
  axes: { y: { unit: "PEN" } },
}

const lines: PlotSpec = {
  title: "NVDA vs S&P 500",
  description: "NVDA le ganó al índice",
  data: [
    { d: "2026-09-01", sym: "NVDA", v: 100 },
    { d: "2026-10-01", sym: "NVDA", v: 112 },
    { d: "2026-11-01", sym: "NVDA", v: 118 },
    { d: "2026-09-01", sym: "S&P 500", v: 100 },
    { d: "2026-10-01", sym: "S&P 500", v: 102 },
    { d: "2026-11-01", sym: "S&P 500", v: 104 },
  ],
  layers: [
    { mark: "line", curve: "smooth", encoding: { x: { field: "d", type: "date" }, y: { field: "v", type: "quantitative" }, color: { field: "sym" } } },
    { mark: "point", encoding: { x: { field: "d", type: "date" }, y: { field: "v", type: "quantitative" }, color: { value: "accent" } } },
  ],
  axes: { y: { zero: false } },
}

describe("motor de gráficos", () => {
  it("las marcas del eje son redondas y cubren todo el rango", () => {
    expect(niceTicks(0, 310, 4)).toEqual([0, 100, 200, 300, 400])
    expect(niceTicks(98, 118, 4)).toEqual([95, 100, 105, 110, 115, 120])
  })

  it("las barras apiladas suman la pila y crecen desde la misma base", () => {
    const scene = buildPlot(stacked, 300, 200)
    expect(scene.bars).toHaveLength(4)
    expect(scene.legend.map((l) => l.name)).toEqual(["Comida", "Ocio"])
    // En octubre, Ocio va encima de Comida: su base es el tope de Comida.
    const comida = scene.bars.find((b) => b.key === "b0-0-0")!
    const ocio = scene.bars.find((b) => b.key === "b0-1-0")!
    expect(ocio.y + ocio.h).toBeCloseTo(comida.y, 5)
    expect(comida.y + comida.h).toBeCloseTo(scene.baseline, 5)
    expect(scene.slots[0].values.map((v) => v.name)).toEqual(["Comida", "Ocio"])
  })

  it("con la categoria en y, las barras son horizontales y el cursor recorre ese eje", () => {
    const scene = buildPlot({ ...stacked, layers: [{ mark: "bar", encoding: { y: { field: "mes", type: "category" }, x: { field: "s", type: "quantitative" } } }], axes: { x: { unit: "PEN" } } }, 320, 160)
    expect(scene.horizontal).toBe(true)
    expect(scene.bars.every((b) => b.x >= scene.box.left - 0.01)).toBe(true)
  })

  it("dos lineas con color por serie, puntos encima y la escala sin cero cuando se pide", () => {
    const scene = buildPlot(lines, 320, 200)
    expect(scene.lines).toHaveLength(2)
    expect(scene.points).toHaveLength(6)
    expect(scene.valueTicks[0].label).not.toBe("0")
    expect(scene.slots).toHaveLength(3)
    expect(nearestSlot(scene, scene.slots[2].pos - 3)).toBe(2)
    expect(plotSummary(lines, scene)).toMatch(/NVDA le ganó al índice\..*NVDA 118/)
  })

  it("sin cero, el area no se sale por debajo; y una serie en dos capas se cuenta una vez", () => {
    const area: PlotSpec = { ...lines, layers: [{ ...lines.layers[0], mark: "area", stack: false }, lines.layers[1]] }
    const scene = buildPlot(area, 320, 200)
    const lowest = Math.max(...scene.areas.flatMap((a) => [...a.d.matchAll(/,(-?[\d.]+)/g)].map((m) => Number(m[1]))))
    expect(lowest).toBeLessThanOrEqual(scene.box.bottom + 0.1)
    const conPuntos = buildPlot({ ...lines, layers: [lines.layers[0], { ...lines.layers[1], encoding: { ...lines.layers[1].encoding, color: { field: "sym" } } }] }, 320, 200)
    expect(conPuntos.slots[0].values.map((v) => v.name)).toEqual(["NVDA", "S&P 500"])
  })

  it("las barras horizontales sueltas llevan su valor al final", () => {
    const scene = buildPlot({ ...stacked, data: stacked.data.filter((row) => row.cat === "Comida"), layers: [{ mark: "bar", encoding: { y: { field: "mes", type: "category" }, x: { field: "s", type: "quantitative" } } }], axes: { x: { unit: "PEN" } } }, 320, 120)
    expect(scene.bars.map((b) => b.label)).toEqual([expect.stringMatching(/^S\/\s220\.00$/), expect.stringMatching(/^S\/\s160\.00$/)])
    expect(buildPlot(stacked, 300, 200).bars.every((b) => b.label === undefined)).toBe(true)
  })

  it("la curva suave pasa por todos los puntos", () => {
    const d = smoothPath([[0, 10], [50, 0], [100, 20]])
    expect(d.startsWith("M0.0,10.0")).toBe(true)
    expect(d).toContain("50.0,0.0")
    expect(d.endsWith("100.0,20.0")).toBe(true)
  })
})

const candles: PlotSpec = {
  title: "AAPL",
  description: "Subió el jueves y bajó el viernes",
  data: [
    { d: "2026-11-20", o: 228, h: 236, l: 227, c: 235 },
    { d: "2026-11-21", o: 235, h: 237, l: 229, c: 230 },
  ],
  layers: [
    { mark: "rule", encoding: { x: { field: "d", type: "date" }, y: { field: "l", type: "quantitative" }, y2: { field: "h" } } },
    { mark: "bar", encoding: { x: { field: "d", type: "date" }, y: { field: "o", type: "quantitative" }, y2: { field: "c" }, color: { when: "c >= o", then: "gain", else: "loss" } } },
  ],
  axes: { y: { unit: "USD", zero: false } },
  interaction: { tooltip: ["o", "h", "l", "c"] },
}

describe("motor de gráficos: etapa 3", () => {
  it("las expresiones comparan campos, numeros y textos, y lo demas es falso sin ejecutarse", () => {
    const row = { c: 235, o: 228, cat: "Comida", monto: "300" }
    expect(evalWhen("c >= o", row)).toBe(true)
    expect(evalWhen("c < 200", row)).toBe(false)
    expect(evalWhen("cat == 'Comida'", row)).toBe(true)
    expect(evalWhen("monto > 250", row)).toBe(true)
    expect(evalWhen("c >= o; alert(1)", row)).toBe(false)
    expect(evalWhen("nada > 1", row)).toBe(false)
  })

  it("velas: mecha de minimo a maximo, cuerpo flotante que crece desde la apertura y color por fila", () => {
    const scene = buildPlot(candles, 320, 210)
    expect(scene.rules).toHaveLength(2)
    expect(scene.bars.map((b) => b.color)).toEqual(["gain", "loss"])
    // El cuerpo del jueves va de 228 a 235: crece desde su propio inicio (abajo), no desde la base del grafico.
    const up = scene.bars[0]
    expect(up.base).toBeCloseTo(up.y + up.h, 5)
    // La escala sin cero cubre el minimo y el maximo de las mechas.
    expect(Number(scene.valueTicks[0].label.replace(/\D/g, ""))).toBeLessThanOrEqual(227)
    expect(scene.slots[0].values.map((v) => `${v.name} ${v.text}`)).toEqual(["o US$ 228.00", "h US$ 236.00", "l US$ 227.00", "c US$ 235.00"])
    expect(scene.slots[1].values[0].color).toBe("loss")
  })

  it("una linea de objetivo entra en la escala aunque supere a las barras, con su nombre", () => {
    const scene = buildPlot({ ...stacked, annotations: [{ type: "rule", axis: "y", value: 500, label: "Tu presupuesto" }] }, 300, 200)
    expect(Number(scene.valueTicks[scene.valueTicks.length - 1].label.replace(/\D/g, ""))).toBeGreaterThanOrEqual(500)
    expect(scene.refLines).toHaveLength(1)
    expect(scene.refLines[0].label?.text).toBe("Tu presupuesto")
    expect(scene.refLines[0].y1).toBe(scene.refLines[0].y2)
    // Y un texto que senala un punto con su circulito.
    const marked = buildPlot({ ...lines, annotations: [{ type: "label", x: "2026-10-01", y: 112, text: "Compraste aquí" }] }, 320, 200)
    expect(marked.texts.find((t) => t.text === "Compraste aquí")?.dot).toBeDefined()
  })

  it("la dona reparte el total, el centro lo dice y se elige la porcion por el angulo", () => {
    const donut: PlotSpec = { title: "Reparto", description: "Comida pesa 75 %", data: [{ cat: "Comida", s: 300 }, { cat: "Ocio", s: 100 }, { cat: "Nada", s: 0 }], layers: [{ mark: "arc", encoding: { theta: { field: "s", unit: "PEN" }, color: { field: "cat" } } }] }
    const scene = buildPlot(donut, 300, plotHeight(donut))
    expect(scene.kind).toBe("arc")
    expect(scene.slices.map((s) => s.share)).toEqual([0.75, 0.25])
    expect(scene.center?.total).toMatch(/^S\/\s400\.00$/)
    const c = scene.center!
    const r = (c.r0 + c.r1) / 2
    // A las 3 en punto esta Comida (empieza a las 12 y ocupa 3/4 de vuelta); a las 10:30, Ocio; en el hueco, nada.
    expect(pickAt(scene, c.x + r, c.y)).toBe(0)
    expect(pickAt(scene, c.x - r * 0.7, c.y - r * 0.7)).toBe(1)
    expect(pickAt(scene, c.x, c.y)).toBeNull()
    expect(plotSummary(donut, scene)).toMatch(/Comida: S\/\s300\.00 · 75 %/)
    expect(arcPath(0, 0, 5, 10, 0, Math.PI * 2).match(/M/g)).toHaveLength(2)
  })

  it("la grilla de calor ubica cada celda, su intensidad va de menos a mas y se toca la mas cercana", () => {
    const grid: PlotSpec = { title: "Calendario", description: "Los lunes gastas más", data: [{ dia: "Lun", sem: "S1", m: 80 }, { dia: "Mar", sem: "S1", m: 20 }, { dia: "Lun", sem: "S2", m: 50 }, { dia: "Mar", sem: "S2", m: null }], layers: [{ mark: "rect", encoding: { x: { field: "dia", type: "category" }, y: { field: "sem", type: "category" }, color: { field: "m", value: "expense" } } }], axes: { y: { unit: "PEN" } } }
    const scene = buildPlot(grid, 300, plotHeight(grid))
    expect(scene.kind).toBe("grid")
    expect(scene.cells.map((c) => Math.round(c.opacity * 100))).toEqual([100, 12, 56, 5])
    expect(scene.ramp?.max).toMatch(/80\.00$/)
    const last = scene.cells[3]
    expect(pickAt(scene, last.x + 2, last.y + 2)).toBe(3)
    expect(scene.slots[3].values[0].text).toBe("—")
  })

  it("los puntos sueltos se tocan uno por uno y el texto escribe el valor sobre la barra", () => {
    const risk: PlotSpec = { title: "Riesgo y retorno", description: "NVDA rinde más pero se mueve más", data: [{ a: "NVDA", r: 30, ret: 40, inv: 500 }, { a: "VOO", r: 12, ret: 10, inv: 1500 }], layers: [{ mark: "point", encoding: { x: { field: "r", type: "quantitative", title: "Riesgo" }, y: { field: "ret", type: "quantitative" }, size: { field: "inv" } } }], interaction: { tooltip: ["a", "ret"] } }
    const scene = buildPlot(risk, 300, 210)
    expect(scene.pick).toBe("xy")
    expect(scene.slots).toHaveLength(2)
    // VOO (menos riesgo) queda a la izquierda y es el punto mas grande: invirtio mas.
    const [voo, nvda] = [...scene.points].sort((a, b) => a.cx - b.cx)
    expect(voo.r).toBeGreaterThan(nvda.r)
    expect(pickAt(scene, voo.cx + 1, voo.cy - 1)).toBe(voo.slot)
    expect(scene.slots[voo.slot].values.map((v) => v.text)).toEqual(["VOO", "10"])

    const withText = buildPlot({ ...stacked, data: stacked.data.filter((r) => r.cat === "Comida"), layers: [{ mark: "bar", encoding: { x: { field: "mes", type: "category" }, y: { field: "s", type: "quantitative" } } }, { mark: "text", encoding: { x: { field: "mes", type: "category" }, y: { field: "s", type: "quantitative" }, text: { field: "s" } } }] }, 300, 200)
    expect(withText.texts.map((t) => t.text)).toEqual([expect.stringMatching(/^S\/\s220$/), expect.stringMatching(/^S\/\s160$/)])
    expect(withText.texts[0].y).toBeLessThan(withText.bars[0].y)
    // Con highlight: false tocar no atenua; con cursor: none no se elige nada.
    expect(buildPlot({ ...stacked, interaction: { highlight: false } }, 300, 200).highlight).toBe(false)
    expect(pickAt(buildPlot({ ...stacked, interaction: { cursor: "none" } }, 300, 200), 100, 100)).toBeNull()
  })
})


describe("dibujo del gráfico", () => {
  it("se lee completo con el lector de pantalla y se recorre valor por valor", async () => {
    await render(<PlotView spec={stacked} />)
    const plot = screen.getByRole("adjustable")
    await fireEvent(plot, "layout", { nativeEvent: { layout: { width: 320, height: 210 } } })

    expect(screen.getByLabelText(/Noviembre fue el mes más barato\. Oct: Comida S\/\s220\.00, Ocio S\/\s90\.00/)).toBeTruthy()
    await fireEvent(plot, "accessibilityAction", { nativeEvent: { actionName: "increment" } })
    expect(screen.getByText("Oct")).toBeTruthy()
    await fireEvent(plot, "accessibilityAction", { nativeEvent: { actionName: "increment" } })
    expect(plot.props.accessibilityValue.text).toMatch(/^Nov: Comida S\/\s160\.00, Ocio S\/\s60\.00$/)
  })
})
