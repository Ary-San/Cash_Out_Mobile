import { Image, Text as NativeText, View } from "react-native"

// La ficha de la web (Checkout-web/public/cashout-chip.svg) pasada a PNG con fondo transparente:
// el SVG trae imagenes y mascaras que react-native-svg no dibuja bien.
const CHIP = require("../../../assets/images/cashout-chip.png")

/** El logotipo de la web: CASH-, la ficha como la O, y UT. */
export function BrandLogo({ size = 26 }: { size?: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Cash-Out" className="flex-row items-center gap-0.5">
      <NativeText maxFontSizeMultiplier={1.2} className="font-brand text-foreground" style={{ fontSize: size * 0.72, letterSpacing: -0.4 }}>
        CASH-
      </NativeText>
      <Image source={CHIP} accessibilityIgnoresInvertColors style={{ width: size, height: size }} />
      <NativeText maxFontSizeMultiplier={1.2} className="font-brand text-foreground" style={{ fontSize: size * 0.72, letterSpacing: -0.4 }}>
        UT
      </NativeText>
    </View>
  )
}
