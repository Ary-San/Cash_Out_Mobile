import { act, fireEvent, render, screen } from "@testing-library/react-native"
import { useCameraPermissions } from "expo-camera"
import { ApiError } from "@/api/errors"
import { assistantService } from "@/services/assistantService"
import type { Draft } from "@/types/assistant"
import ScanScreen from "../app/(app)/scan"

// La camara no existe en las pruebas: el mock guarda lo que la pantalla le pasa para simular una lectura.
let onScanned: ((result: { data: string }) => void) | undefined
jest.mock("expo-camera", () => ({
  useCameraPermissions: jest.fn(),
  CameraView: (props: { onBarcodeScanned?: (result: { data: string }) => void }) => {
    onScanned = props.onBarcodeScanned
    return null
  },
}))
jest.mock("@/services/assistantService", () => ({ assistantService: { drafts: jest.fn(), confirm: jest.fn() } }))
jest.mock("expo-router", () => ({ router: { back: jest.fn(), replace: jest.fn() } }))

const permissions = useCameraPermissions as jest.Mock
const drafts = assistantService.drafts as jest.Mock

const QR = "20100070970|03|B001|00012345|5.49|35.90|2026-10-27|1|45678912|aGFzaA==|"
const receipt: Draft = {
  kind: "EXPENSE",
  description: "Boleta B001-12345",
  amount: 35.9,
  currency: "PEN",
  date: "2026-10-27",
  paymentMethod: null,
  category: "OTHER",
  confidence: 0.2,
  alternatives: [],
  source: "KEYWORDS",
  warnings: [],
  ruc: "20100070970",
  receiptRef: "abc",
  alreadyRegisteredAt: null,
}

describe("ScanScreen", () => {
  beforeEach(() => {
    drafts.mockReset()
    onScanned = undefined
  })

  it("sin permiso explica para que es la camara y deja ingresar a mano", async () => {
    const request = jest.fn()
    permissions.mockReturnValue([{ granted: false, canAskAgain: true }, request])
    await render(<ScanScreen />)

    expect(screen.getByText("Necesitamos la cámara")).toBeOnTheScreen()
    await fireEvent.press(screen.getByText("Permitir cámara"))
    expect(request).toHaveBeenCalled()
    expect(screen.getByText("Ingresar a mano")).toBeOnTheScreen()
  })

  it("si el permiso se nego para siempre, manda a los ajustes", async () => {
    permissions.mockReturnValue([{ granted: false, canAskAgain: false }, jest.fn()])
    await render(<ScanScreen />)

    expect(screen.getByText("Abrir ajustes")).toBeOnTheScreen()
  })

  it("lee el QR una sola vez y muestra la boleta como tarjeta", async () => {
    permissions.mockReturnValue([{ granted: true, canAskAgain: true }, jest.fn()])
    drafts.mockResolvedValue([receipt])
    await render(<ScanScreen />)

    await act(async () => {
      onScanned?.({ data: QR })
      onScanned?.({ data: QR })
    })

    expect(drafts).toHaveBeenCalledTimes(1)
    expect(drafts).toHaveBeenCalledWith({ qr: QR })
    expect(await screen.findByDisplayValue("Boleta B001-12345")).toBeOnTheScreen()
    expect(screen.getByDisplayValue("35.90")).toBeOnTheScreen()
  })

  it("un QR que no es de boleta muestra el motivo y deja escanear otra vez", async () => {
    permissions.mockReturnValue([{ granted: true, canAskAgain: true }, jest.fn()])
    drafts.mockRejectedValue(
      new ApiError({ kind: "http", status: 400, serverMessage: "Este QR no es de un comprobante electrónico de SUNAT." }),
    )
    await render(<ScanScreen />)

    await act(async () => onScanned?.({ data: "https://ejemplo.com" }))

    expect(await screen.findByText("Este QR no es de un comprobante electrónico de SUNAT.")).toBeOnTheScreen()
    await fireEvent.press(screen.getByText("Escanear otra vez"))
    expect(onScanned).toBeDefined()
  })
})
