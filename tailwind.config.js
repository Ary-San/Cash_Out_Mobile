/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      // Una familia por peso: con fuentes propias, fontWeight no cambia de archivo en Android.
      fontFamily: {
        sans: ["Geist_400Regular"],
        "sans-medium": ["Geist_500Medium"],
        "sans-semibold": ["Geist_600SemiBold"],
        display: ["InstrumentSerif_400Regular"],
        "display-italic": ["InstrumentSerif_400Regular_Italic"],
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        popover: "var(--popover)",
        primary: { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        secondary: { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        accent: { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        destructive: "var(--destructive)",
        income: "var(--income)",
        expense: "var(--expense)",
        gain: "var(--gain)",
        loss: "var(--loss)",
        success: "var(--success)",
        warning: "var(--warning)",
        "signal-up": "var(--signal-up)",
        "signal-down": "var(--signal-down)",
        "accent-ink": "var(--accent-ink)",
      },
    },
  },
  plugins: [],
}
