/** GET /whatsapp: el numero vinculado y como vincularlo. */
export interface WhatsAppStatus {
  linked: boolean
  /** Enmascarado, como "+51 9•• ••• 777"; null si no hay numero. */
  phone: string | null
  /** El codigo vigente para vincular ("CO-123456"); null si no hay uno. */
  code: string | null
  codeExpiresAt: string | null
  /** El numero de Cash-Out al que se escribe, en formato internacional. */
  number: string
  /** Lo que hay que mandar primero al sandbox de Twilio ("join dos-palabras"); null si no hace falta. */
  joinText: string | null
}
