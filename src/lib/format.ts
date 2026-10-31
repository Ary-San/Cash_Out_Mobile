/** "Ana María Torres" → "Ana"; sin nombre, un saludo que igual funciona. */
export function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] || "de nuevo"
}

/** "Ana María Torres" → "AT": la primera letra del primer y del ultimo nombre. */
export function initials(name: string | null | undefined): string {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? []
  if (words.length === 0) return "?"
  const last = words.length > 1 ? words[words.length - 1][0] : ""
  return (words[0][0] + last).toUpperCase()
}

/** "miércoles 28 de octubre", con la primera letra en mayuscula. */
export function longToday(now: Date = new Date()): string {
  const text = now.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })
  return text.charAt(0).toUpperCase() + text.slice(1)
}
