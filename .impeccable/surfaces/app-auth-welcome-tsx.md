---
version: 1
slug: "app-auth-welcome-tsx"
primary_target: "app/(auth)/welcome.tsx"
related_targets: []
---

# Bienvenida (app, sin sesión)

Scope: `app/(auth)/welcome.tsx`, primera pantalla al abrir la app sin sesión. Mode: Persuade.

Audience: jóvenes de 18 a 30 que abren Cash-Out por primera vez (o el jurado en la demo). Job: entender en segundos qué es y elegir Crear cuenta o Ya tengo cuenta. Proof: el mecanismo real de la app (cumplir una meta de ahorro da fichas: 1 % de la meta, tope 100). Constraints: Expo Go SDK 58, Android e iPhone, claro y oscuro, reducir movimiento, letra grande.

## Direction contract

THESIS: la pantalla demuestra el mecanismo, no lo describe: una meta se cumple delante de ti y se convierte en fichas. Rechaza la portada de categoría (logo, frase, dos botones sobre degradado).
OWN-WORLD: la seda malva de la web (shader de pliegues, mismos 8 tonos por tema) como suelo; Instrument Serif con la cursiva en accent-ink para el titular; Geist para todo lo demás; botón primario lleno en primary, secundario con borde; tarjetas con rounded-2xl y border.
STORY: ve una meta llenarse hasta 100 %, ve "+20 fichas" salir de ella, lee "Ahorra, planifica e invierte sin arriesgar tu dinero", toca Crear cuenta gratis.
FIRST VIEWPORT: arriba la marca Cash-Out pequeña; en el tercio superior-medio un anillo de meta de ~200 pt con "Laptop · S/ 2,000" y el porcentaje contando; al llegar a 100 % un destello y una ficha "+20 fichas" que sube desde el anillo; abajo el titular serif de 3 líneas, una línea de apoyo y, anclados al borde inferior, los dos botones.
FORM: estructura "Anillo de meta", posición 5 de 7 en mi lista (dealt lead). seed:68cab94f2d65ec91
SIGNATURE: el anillo que se llena y se convierte en fichas, en bucle tranquilo cada ~6 s; con reducir movimiento, estado final quieto.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
