import { AxiosError, AxiosHeaders } from "axios"
import { ApiError, toApiError, userMessage } from "@/api/errors"

function httpError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError("fallo", "ERR_BAD_RESPONSE", config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data,
  })
}

describe("errors", () => {
  it("traduce los errores de axios a un tipo", () => {
    expect(toApiError(new AxiosError("x", "ERR_CANCELED")).kind).toBe("canceled")
    expect(toApiError(new AxiosError("x", "ECONNABORTED")).kind).toBe("timeout")
    expect(toApiError(new AxiosError("x", "ERR_NETWORK")).kind).toBe("network")
    expect(toApiError(new Error("raro")).kind).toBe("unknown")
  })

  it("lee el mensaje y los errores por campo del backend", () => {
    const error = toApiError(
      httpError(400, { status: 400, message: "Revisa el correo", fieldErrors: [{ field: "email", message: "Inválido" }] }),
    )
    expect(error.status).toBe(400)
    expect(error.fieldErrors).toEqual({ email: "Inválido" })
    expect(userMessage(error)).toBe("Revisa el correo")
  })

  it("solo se reintenta lo que puede salir bien la segunda vez", () => {
    expect(new ApiError({ kind: "network" }).retryable).toBe(true)
    expect(new ApiError({ kind: "http", status: 503 }).retryable).toBe(true)
    expect(new ApiError({ kind: "http", status: 501 }).retryable).toBe(false)
    expect(new ApiError({ kind: "http", status: 400 }).retryable).toBe(false)
  })

  it("los mensajes de 401 y 429 son para el usuario, no del servidor", () => {
    expect(userMessage(new ApiError({ kind: "http", status: 401, serverMessage: "jwt expired" }))).toMatch(/sesión expiró/)
    expect(userMessage(new ApiError({ kind: "http", status: 429 }))).toMatch(/demasiadas/)
  })
})
