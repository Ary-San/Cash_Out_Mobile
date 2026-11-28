import { Platform } from "react-native"
import { File, Paths } from "expo-file-system"
import * as Print from "expo-print"
import * as Sharing from "expo-sharing"
import { formatSoles } from "@/lib/format"
import { movementService } from "@/services/movementService"
import type { MonthReport } from "@/types/budgets"

const MONTH = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" })
const DAY = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" })

export function monthTitle(month: string): string {
  return MONTH.format(new Date(`${month}-01T00:00:00Z`)).replace(/^./, (c) => c.toUpperCase())
}

/** Lo que viene del usuario (descripciones) entra al HTML como texto, nunca como etiquetas. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

/** La hoja del mes para el PDF: totales, gasto por categoria con su presupuesto y cada movimiento. */
export function reportHtml(report: MonthReport): string {
  const totals = [
    ["Entró", report.income],
    ["Gastaste", report.expense],
    [report.net >= 0 ? "Ahorraste" : "Gastaste de más", Math.abs(report.net)],
  ] as const
  const categories = report.categories
    .map((line) => {
      const over = line.limit !== null && line.spent > line.limit
      return `<tr><td>${escapeHtml(line.name)}</td><td class="n">${formatSoles(line.spent)}</td><td class="n${over ? " over" : ""}">${line.limit === null ? "—" : formatSoles(line.limit)}</td></tr>`
    })
    .join("")
  const movements = report.movements
    .map(
      (m) =>
        `<tr><td class="d">${DAY.format(new Date(`${m.date}T00:00:00Z`))}</td><td>${escapeHtml(m.label)}</td><td class="n${m.kind === "INCOME" ? " in" : ""}">${m.kind === "INCOME" ? "+" : "−"}${formatSoles(m.amount)}</td></tr>`,
    )
    .join("")
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#1d1b18;margin:32px;font-size:12px}
h1{font-size:26px;margin:2px 0 18px}p.k{color:#6b665e;margin:0}h2{font-size:14px;margin:22px 0 6px}
.t{display:flex;gap:10px}.t div{flex:1;border:1px solid #ddd8cf;border-radius:10px;padding:10px}
.t b{display:block;font-size:17px;margin-top:2px}table{width:100%;border-collapse:collapse}
th{text-align:left;color:#6b665e;font-weight:500;font-size:11px;border-bottom:1px solid #ddd8cf;padding:5px 0}
td{border-bottom:1px solid #eee9e1;padding:5px 0}.n{text-align:right;font-variant-numeric:tabular-nums}
.d{color:#6b665e;white-space:nowrap;padding-right:10px}.over{color:#9a3e67}.in{color:#2f6b4f}
tr{page-break-inside:avoid}footer{color:#6b665e;font-size:10px;margin-top:22px}
</style></head><body>
<p class="k">Cash-Out · reporte del mes</p><h1>${monthTitle(report.month)}</h1>
<div class="t">${totals.map(([label, value]) => `<div><span>${label}</span><b>${formatSoles(value)}</b></div>`).join("")}</div>
${categories ? `<h2>Gasto por categoría</h2><table><tr><th>Categoría</th><th class="n">Gastado</th><th class="n">Presupuesto</th></tr>${categories}</table>` : ""}
<h2>Movimientos (${report.movements.length})</h2>
${movements ? `<table><tr><th>Fecha</th><th>Descripción</th><th class="n">Monto</th></tr>${movements}</table>` : "<p>No hay movimientos en este mes.</p>"}
<footer>Montos en soles. Generado por Cash-Out, un proyecto académico de educación financiera.</footer>
</body></html>`
}

async function share(uri: string, mimeType: string, UTI: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Este dispositivo no deja compartir archivos.")
  await Sharing.shareAsync(uri, { mimeType, UTI, dialogTitle })
}

/** El CSV del mes (lo arma el backend, con las formulas ya neutralizadas) para abrir en Excel o mandar. */
export async function shareMonthCsv(month: string): Promise<void> {
  const csv = await movementService.exportCsv(month)
  const name = `cash-out-${month}.csv`
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)
    return
  }
  const file = new File(Paths.cache, name)
  if (file.exists) file.delete()
  file.create()
  file.write(csv)
  await share(file.uri, "text/csv", "public.comma-separated-values-text", "Compartir el CSV del mes")
}

/** El PDF del mes: se arma en el telefono con expo-print y se comparte (guardar, WhatsApp, correo). */
export async function shareMonthPdf(month: string): Promise<void> {
  const html = reportHtml(await movementService.report(month))
  if (Platform.OS === "web") {
    await Print.printAsync({ html })
    return
  }
  const { uri } = await Print.printToFileAsync({ html })
  await share(uri, "application/pdf", "com.adobe.pdf", "Compartir el PDF del mes")
}
