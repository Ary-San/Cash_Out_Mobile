# Proyecto: Cash-Out - App móvil

**Curso:** CS2031 Desarrollo Basado en Plataformas, 2026-2, UTEC

**Integrantes:**

| Nombre | Código | Participación |
|:------:|:------:|:-------------:|
| Azul Arbulú Silva | 202510303 | 100\% |
| Alba Abigail Cabrera Pilco | 202510505 | 100\% |
| Dylan Carlo Van Oordt Arbulú | 202510757 | 100\% |
| Ary Fernando Sanchez Cerna | 201920061 | 100\% |
| Miguel Angel Flores Cardenas | 202510147 | 100\% |

---

App de finanzas personales para jóvenes: registra lo que entra y sale (en soles), ponle metas a tu ahorro y practica invertir con **fichas** sobre precios reales, sin arriesgar dinero.

- **Web:** <https://cash-out-front-web.vercel.app>
- **API:** <https://cash-out-front-web.vercel.app/api/v1>
- **Publicación:** EAS Update, canal `production`, se abre en *Expo Go* (SDK 58)

## Explicación breve de sus funciones

| Pantalla | Funciones |
|---|---|
| Bienvenida | Seda animada (shader Skia), una meta de ejemplo que se convierte en fichas, crear cuenta o entrar |
| Resumen | Disponible, fichas, el mes por categorías, metas y últimos movimientos |
| Movimientos | Registrar con una frase ("almuerzo 15 soles"), con el QR de una boleta SUNAT o a mano; lista virtualizada con filtros |
| Metas | Crear, aportar, pronóstico de llegada, celebración al cumplir (+ fichas) |
| Proyecciones | Interés simple vs compuesto, tasas de referencia, escenarios guardados y "proyectar esta meta" |
| Portafolio | Mercado (acciones de EE. UU. y cripto), órdenes con fichas, posiciones, noticias, favoritos |
| Minijuegos | Salas en vivo de **¿Sube o baja?**, **Arma tu portafolio** y la **Carrera de trading**: crear la sala desde el celular (anfitrión) o entrar con el código o el QR; celular y laptop juegan en la misma sala |
| Perfil | Datos y foto, contraseña, biometría, tema, correos del banco (Gmail), atajo de iPhone, eliminar cuenta |

## Tecnologías

### Base
- **Expo SDK 58** - **React Native 0.88** - **React 19.3** - **TypeScript**
- **expo-router**: rutas por archivos (`app/`), pestañas y pantallas apiladas, rutas protegidas por sesión
- **React Compiler** activo (memorización automática)

### Diseño
- **NativeWind 4 + Tailwind CSS 3.4**: estilos con clases, los mismos tokens que la web
- **Tokens de color** en `global.css` y `src/theme/palette.ts`, con **modo claro y oscuro**
- **Tipografía** con `@expo-google-fonts`: Geist (texto), Instrument Serif (títulos) y Radio Canada Big (logotipo)
- **lucide-react-native** (íconos), **expo-image** (foto de perfil con caché)
- **react-native-svg**: gráficos propios (líneas del portafolio y de proyecciones, anillos de metas)
- **@shopify/react-native-skia**: la seda animada de la bienvenida
- **react-native-reanimated 4**: hojas, transiciones y la animación de la bienvenida
- **expo-haptics**: vibración al confirmar órdenes, cumplir metas y desbloquear
- Componentes propios en `src/components/ui/`: `Button`, `Card`, `Field`, `Sheet`, `Segmented`, `Screen`/`ListScreen`, `Toast`, `States`, `OfflineBanner`

### Datos y estado
- **axios** con un cliente central (`src/api/client.ts`): `baseURL`, `Authorization: Bearer`, renovación automática del token ante un 401 y timeout de 15 s
- **Context + custom hooks**: `AuthProvider`/`useAuth`, `useApiQuery` (carga, error, cancelación con `AbortController` y reintento), `usePolling`, `useLivePrices` (SSE)
- **zod** + **react-hook-form**: validación antes de enviar, con las mismas reglas que el backend
- **@react-native-community/netinfo**: aviso sin conexión y recarga automática al volver la red

### Minijuegos en vivo
- **Salas por SSE** (`useLiveRoom`): el estado de la sala llega en vivo y se reconecta solo si se corta la red; la carrera suma a la serie el precio de cada tick (4 por segundo)
- **Las mismas salas que la web**: el QR lleva el link de la web, así que una laptop o un celular sin la app entran por el navegador, y la app reconoce el mismo link al escanearlo. Con solo el código, la app averigua de qué juego es la sala
- **react-native-qrcode-svg**: el QR de la sala para el anfitrión, con el botón de compartir el código
- **expo-keep-awake**: la pantalla no se apaga durante la partida
- La cuota de la carrera son fichas reales: se confirma el monto y, con la biometría activa, con la huella; si son menos de 3 jugadores se devuelve

### Sensores
- **Cámara** (`expo-camera`): leer el QR de las boletas SUNAT y el de las salas de minijuegos; **expo-image-picker** para la foto de perfil
- **Lector de huella o rostro** (`expo-local-authentication`): entrar a la app y confirmar órdenes, la cuota de la carrera y la eliminación de la cuenta

### Seguridad
- Token de acceso solo en memoria; refresh token en **expo-secure-store** (Keystore / Keychain)
- Bloqueo biométrico al abrir y al volver tras 2 minutos en segundo plano
- Órdenes idempotentes (`clientOrderId`) y confirmación de acciones destructivas
- Sin secretos en la app: la única variable es la URL pública de la API

### Accesibilidad
- Roles y etiquetas en español para lectores de pantalla, áreas táctiles de 44 pt
- Letra del sistema con tope (1,6× texto, 1,3× títulos) y alturas mínimas en vez de fijas
- Respeta "Reducir movimiento"; ancho máximo en tablet

### Calidad
- **Jest 30** + **React Native Testing Library 14** (104 pruebas), **ESLint** (`expo lint`) y `tsc`

## Estructura

```
app/                 rutas (expo-router)
  (auth)/            bienvenida, login, registro
  (app)/(tabs)/      resumen, movimientos, metas, portafolio, perfil y minijuegos
  (app)/games/       las salas en vivo (sube o baja, portafolio, carrera) y el escáner de salas
  (app)/...          detalle de meta, activo, movimiento, proyección, ajustes, escáner de boletas
src/
  api/               cliente axios, errores, almacenamiento de tokens
  services/          una capa por recurso del backend
  hooks/             lógica reutilizable (consultas, polling, salas en vivo, biometría, movimiento reducido)
  contexts/          sesión
  components/        UI por dominio y componentes base en ui/
  lib/               reglas puras (montos, fechas, proyecciones, salas y reglas de cada juego, validación)
  theme/             paleta y preferencia de tema
  types/             tipos de las respuestas del backend
__tests__/           pruebas de pantallas y flujos
```

## Correr en local

```bash
npm install
cp .env.example .env    # EXPO_PUBLIC_API_URL: la API (en el celular, la IP de tu computadora, no localhost)
npx expo start -c
```

Escanea el QR con **Expo Go** (SDK 58).

```bash
npm test          # pruebas
npm run lint      # ESLint
npx tsc --noEmit  # tipos
```

## Publicar (EAS Update)

```bash
eas update --channel production --environment production --message "descripción del cambio"
```

- `EXPO_PUBLIC_API_URL` de producción vive en el environment `production` de EAS.
- `runtimeVersion` usa la política `sdkVersion`, la que Expo Go puede abrir.
- Para abrir la actualización en Expo Go hay que iniciar sesión en Expo Go con la cuenta dueña del proyecto.
