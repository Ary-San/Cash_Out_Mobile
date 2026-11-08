import { avatarError, scanMessage } from "@/lib/profile"

describe("perfil", () => {
  it("la foto acepta lo mismo que el backend: JPG, PNG o GIF de hasta 2 MB", () => {
    expect(avatarError({ mimeType: "image/png", fileSize: 500_000 })).toBeNull()
    expect(avatarError({ mimeType: "image/heic", fileSize: 500_000 })).toBe("La foto tiene que ser JPG, PNG o GIF.")
    expect(avatarError({ mimeType: "image/jpeg", fileSize: 3 * 1024 * 1024 })).toMatch(/más de 2 MB/)
    // Sin datos del archivo decide el backend.
    expect(avatarError({})).toBeNull()
  })

  it("la lectura del mes se cuenta en una frase", () => {
    expect(scanMessage({ read: 0, added: 0 })).toBe("No encontramos correos de consumo del BCP este mes.")
    expect(scanMessage({ read: 1, added: 0 })).toBe("Revisamos 1 correo del BCP de este mes: no hay movimientos nuevos.")
    expect(scanMessage({ read: 9, added: 2 })).toBe("Revisamos 9 correos del BCP de este mes: 2 movimientos nuevos en Movimientos.")
  })
})
