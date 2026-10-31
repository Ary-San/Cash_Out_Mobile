import { firstName, initials, longToday } from "@/lib/format"

describe("format", () => {
  it("firstName toma el primer nombre y tiene un saludo si no hay", () => {
    expect(firstName("  Ana María Torres ")).toBe("Ana")
    expect(firstName(undefined)).toBe("de nuevo")
    expect(firstName("   ")).toBe("de nuevo")
  })

  it("initials usa el primer y el ultimo nombre", () => {
    expect(initials("Ana María Torres")).toBe("AT")
    expect(initials("ana")).toBe("A")
    expect(initials(null)).toBe("?")
  })

  it("longToday empieza en mayuscula y dice el dia y el mes", () => {
    const text = longToday(new Date(2026, 9, 28))
    expect(text.charAt(0)).toBe(text.charAt(0).toUpperCase())
    expect(text).toMatch(/28/)
    expect(text.toLowerCase()).toMatch(/octubre/)
  })
})
