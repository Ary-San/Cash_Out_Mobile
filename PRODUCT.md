# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Una sola app Expo (React Native) con el mismo diseño en Android y iPhone; se prueba y se presenta en ambos por igual. Respeta lo nativo de cada uno (gesto de volver, zonas seguras, teclado, letra del sistema, reducir movimiento), sin cambiar de lenguaje visual por sistema.

## Users

Jóvenes de 18 a 30 años en Perú que empiezan a manejar su propio dinero. Usan la app en el celular, en momentos cortos: anotar un gasto, ver cuánto les queda, aportar a una meta, practicar una inversión.

## Product Purpose

Cash-Out es una app de finanzas personales para aprender a manejar el dinero haciendo: registrar lo que entra y sale (en soles), ponerle metas al ahorro y practicar en el mercado con fichas, sin arriesgar dinero real. Éxito es que la persona entienda en qué se le va la plata, ahorre para algo concreto y pierda el miedo a invertir.

## Positioning

Invertir se practica con fichas simuladas sobre precios reales (acciones de EE. UU. y cripto): equivocarse no cuesta nada. Las fichas se ganan cumpliendo metas de ahorro, así que ahorrar y aprender a invertir son parte del mismo hábito.

## Operating Context

- Proyecto 2 del curso CS2031 (UTEC). Se presenta con una demo en vivo de unos 6 minutos: login, resumen y un flujo principal. Conviene evitar el registro en vivo.
- Hay una versión web (React + Vite) con la misma identidad, desplegada en Vercel, y un backend Spring Boot en AWS.
- Registro rápido de movimientos: una frase escrita ("almuerzo 15 soles"), el QR de una boleta SUNAT, o automático desde Gmail (avisos del banco) y el atajo de iPhone (Apple Pay).

## Capabilities and Constraints

- Movimientos (gastos e ingresos), metas de ahorro con aportes, fichas, portafolio simulado con órdenes, noticias del mercado, minijuegos ("¿Sube o baja?", "Arma tu portafolio").
- Cuenta: correo y contraseña, o Google (solo en la web por ahora; en la app requiere una compilación EAS). Biometría para entrar y para confirmar órdenes y eliminar la cuenta.
- Funciona en Expo Go (SDK 58): nada que exija módulos nativos fuera de Expo.
- Moneda: soles (S/) para el dinero real; fichas (1 ficha = 1 US$) para el simulador.
- Abierto: la publicación en Expo (EAS Update) todavía no está hecha.

## Brand Commitments

- Nombre: **Cash-Out**. Idioma: español de Perú, tuteo, frases cortas y concretas, sin jerga financiera innecesaria.
- Misma identidad que la web: Geist para el texto, Instrument Serif para títulos, paleta en `src/theme/palette.ts` y `global.css`, con modo claro y oscuro.
- La web usa en su portada un fondo de "seda" animado (`SilkWaves`) con la frase "Ahorra, planifica e invierte sin arriesgar tu dinero".

## Evidence on Hand

- Logo e íconos de la app en `assets/images/` (icon.png, android-icon-*.png, logo-glow.png).
- No hay testimonios, cifras de usuarios ni prensa: no inventarlos.

## Product Principles

1. Aprender haciendo, sin riesgo: todo lo que asusta (invertir) se practica con fichas.
2. Registrar tiene que costar segundos; si no, nadie lo hace.
3. Honestidad con el dinero: lo apartado para metas no se muestra como disponible, y lo simulado siempre se nota simulado.
4. La app y la web son el mismo producto: mismo nombre, voz e identidad.

## Accessibility & Inclusion

Respeta el tamaño de letra del sistema (con tope para no romper el layout), "Reducir movimiento", lectores de pantalla (roles y etiquetas en español) y áreas táctiles de 44 pt / 48 dp.
