# Deudas & Ventas (Sales / Debts Manager)

Aplicación **PWA** (instalable) para **gestionar ventas y deudas de clientes**, pensada para llevar control rápido desde el celular o escritorio, sin depender de servidor.

## ¿Para qué sirve?

- Registrar y administrar **ventas** (historial, montos, seguimiento).
- Registrar y administrar **deudas** (quién debe, cuánto, control de pagos pendientes).
- Usar la app como **gestor personal o de negocio**, con datos guardados localmente en el dispositivo.

## Modos de la aplicación: Ventas y Deudas

La app soporta **dos modos independientes**:

- Cambias entre modos con el botón **"Ventas" / "Deudas"** en el encabezado.
- **Cada modo guarda sus datos por separado** en el almacenamiento local del navegador:
  - Ventas: `sales-manager-state-v1`
  - Deudas: `debts-manager-state-v1`
- El modo seleccionado se persiste en: `app-mode-v1`
- La UI se adapta dinámicamente (títulos, botones y textos cambian según el modo).
- **No se mezclan registros**: puedes gestionar deudas personales sin afectar el histórico de ventas.

### Limitación actual
- El exportador **PDF** mantiene un título orientado a *pagos pendientes* (si quieres una versión específica para “Deudas”, se puede ajustar).

---

## PWA (Instalable en iOS, Android y Escritorio)

La app incluye soporte **PWA** para instalarla desde el navegador.

### Probar localmente
1. `npm run dev`
2. Abre la URL local (ej: `http://localhost:5173`)
3. DevTools > Application > Manifest debe mostrar datos válidos.
4. Chrome/Edge: icono de instalar en la barra.
5. Safari iOS: Compartir > **Agregar a pantalla de inicio**.

### Archivos clave
- `public/manifest.webmanifest`
- `public/sw.js`
- `index.html`
- `src/main.ts`

### Consejos
- Ya no es necesario cambiar manualmente `CACHE_NAME`; el Service Worker se versiona automáticamente.
- Agrega más tamaños de íconos si lo necesitas (ej: 192, 256, 384, 512 *maskable*).
- iOS no soporta `beforeinstallprompt`; la instalación es manual.

---

## Desarrollo

- Requisitos: **Node 18+**
- Scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run preview`

La app está actualizada a **Svelte 5 (runes)**:
- Reactividad con `$state`, `$derived`, `$effect`
- Props con `$props()`
- Eventos como callback props (`onclick/onsubmit`), sin `createEventDispatcher`

---

## Actualización automática forzada (Versionado del Service Worker)

En cada build se genera `.env.production.local` (ignorado por git) con `VITE_APP_VERSION`:

`<version-package.json>-<hash-git-corto>-<timestamp YYYYMMDDHHMMSS>`

Ejemplo: `0.1.3-a1b2c3d-20250913174522`

- `scripts/generate-version.mjs` corre automáticamente en `npm run build` (hook `prebuild`).
- El SW se registra como: `sw.js?v=<VITE_APP_VERSION>`
- El `sw.js`:
  - usa el parámetro `v` para crear un `CACHE_NAME` único
  - borra caches antiguos en `activate`
  - soporta `skipWaiting` y fuerza recarga cuando toma control

Resultado: al desplegar una nueva versión, los usuarios reciben la actualización sin pasos manuales (cuando el SW se activa).

---

## Android (Capacitor) build

### Requisitos previos
- Android Studio + SDK Platform 33+ (o la que Gradle pida)
- Java 17 (JDK 17)

### Pasos rápidos
1. `npm run build`
2. `npm run android:build`  
   - Genera: `android/app/build/outputs/apk/release/app-release-unsigned.apk`
3. Firma el APK para evitar advertencias al instalar:
   - Crear keystore (si no tienes):
     ```powershell
     keytool -genkeypair -v -keystore yut.keystore -alias yut -keyalg RSA -keysize 2048 -validity 3650
     ```
   - Firmar y verificar:
     ```powershell
     # Firma (apksigner viene con el SDK de Android)
     $env:PATH+=";${env:ANDROID_HOME}\build-tools\<version>"; apksigner sign --ks yut.keystore android\app\build\outputs\apk\release\app-release-unsigned.apk
     # Verifica la firma
     apksigner verify android\app\build\outputs\apk\release\app-release-unsigned.apk
     ```
   - Alternativa: Android Studio > Build > Generate Signed Bundle/APK

### Notas para reducir “APK extraño”
- ID de app en formato Java sin guiones (ej: `com.salesgestor.ap`)
- Tráfico claro deshabilitado (networkSecurityConfig) y `androidScheme` en https
- Firma de lanzamiento con keystore propio

---

## Versionado semántico automático (commit-msg + tags)

Hay un hook `commit-msg` que aplica bump semántico, enmienda el commit y crea un tag `vX.Y.Z`.

Reglas:
- `BREAKING CHANGE:` o `tipo!:` → **MAJOR**
- `feat:` → **MINOR**
- `fix:` / `perf:` / `release:` → **PATCH**

(Ver scripts en `scripts/` y hook `.husky/commit-msg`.)
