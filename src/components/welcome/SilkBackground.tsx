import { useMemo, useState } from "react"
import { StyleSheet, useWindowDimensions, type LayoutChangeEvent } from "react-native"
import { Canvas, Fill, LinearGradient, Rect, Shader, Skia, useClock, vec } from "@shopify/react-native-skia"
import { useDerivedValue, useSharedValue } from "react-native-reanimated"
import { useColorScheme } from "nativewind"
import { useReducedMotion } from "@/hooks/useReducedMotion"
import { palette, silk } from "@/theme/palette"

// El shader de seda de la web (SilkWaves) pasado a SkSL: las mismas capas de plegado y la misma rampa de color.
// Si el dispositivo no puede compilar el shader queda en null y la pantalla usa el fondo liso.
const SOURCE = Skia.RuntimeEffect.Make(`
uniform float2 uResolution;
uniform float uTime;
uniform float3 c0; uniform float3 c1; uniform float3 c2; uniform float3 c3;
uniform float3 c4; uniform float3 c5; uniform float3 c6; uniform float3 c7;

float3 ramp(float t) {
  float3 c = c0;
  c = mix(c, c1, smoothstep(0.0 / 7.0, 1.0 / 7.0, t));
  c = mix(c, c2, smoothstep(1.0 / 7.0, 2.0 / 7.0, t));
  c = mix(c, c3, smoothstep(2.0 / 7.0, 3.0 / 7.0, t));
  c = mix(c, c4, smoothstep(3.0 / 7.0, 4.0 / 7.0, t));
  c = mix(c, c5, smoothstep(4.0 / 7.0, 5.0 / 7.0, t));
  c = mix(c, c6, smoothstep(5.0 / 7.0, 6.0 / 7.0, t));
  c = mix(c, c7, smoothstep(6.0 / 7.0, 7.0 / 7.0, t));
  return c;
}

half4 main(float2 fragCoord) {
  float2 frag = float2(fragCoord.x, uResolution.y - fragCoord.y);
  float2 p = (frag - 0.5 * uResolution) / uResolution.y * 2.0;
  float t = uTime * 0.25;
  for (int i = 0; i < 5; i++) {
    float k = float(i) + 1.0;
    p += 0.5 / k * float2(
      sin(p.y * 0.75 * k + t * 1.2 + 1.3 * k),
      cos(p.x * 0.65 * k - t * 0.9 + 0.9 * k)
    );
  }
  float fold = 0.5 + 0.5 * sin((p.x * 0.9 + p.y * 0.55) * 2.2 + t * 1.6);
  fold = fold * fold * (3.0 - 2.0 * fold);
  fold = pow(fold, 1.4);
  return half4(ramp(fold), 1.0);
}
`)

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/**
 * Pliegues de seda que se mueven lento, como en la portada web. Abajo se funde
 * con el fondo para que el texto y los botones se lean sobre un color liso.
 * Con "Reducir movimiento" queda quieta en un cuadro.
 */
export function SilkBackground({ active = true }: { active?: boolean }) {
  // El tamano real del lienzo: en Android con la barra de navegacion transparente es mas alto que la ventana.
  const windowSize = useWindowDimensions()
  const [size, setSize] = useState({ width: windowSize.width, height: windowSize.height })
  const { width, height } = size
  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout
    if (w !== width || h !== height) setSize({ width: w, height: h })
  }
  const { colorScheme } = useColorScheme()
  const theme = colorScheme === "dark" ? "dark" : "light"
  const reduced = useReducedMotion()
  const clock = useClock()

  const colors = useMemo(() => Object.fromEntries(silk[theme].map((hex, i) => [`c${i}`, rgb(hex)])), [theme])
  // Detras del login la seda se congela: el reloj sigue, pero el tiempo del shader no avanza y no se redibuja.
  const shown = useSharedValue(8)
  const uniforms = useDerivedValue(() => {
    if (active && !reduced) shown.set(8 + clock.value / 1000)
    return { uResolution: [width, height], uTime: shown.value, ...colors }
  }, [width, height, reduced, active, colors])
  const background = palette[theme].background

  if (!SOURCE) return null
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      <Fill>
        <Shader source={SOURCE} uniforms={uniforms} />
      </Fill>
      {/* El velo: la seda se apaga hacia abajo y deja el titular y los botones sobre el fondo. */}
      {/* Con margen de sobra abajo: si el lienzo mide mas que la ventana, la seda no asoma bajo los botones. */}
      <Rect x={0} y={height * 0.42} width={width} height={height * 0.58 + 400}>
        <LinearGradient start={vec(0, height * 0.42)} end={vec(0, height * 0.66)} colors={[`${background}00`, background]} />
      </Rect>
    </Canvas>
  )
}
