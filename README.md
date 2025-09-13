## Android (Capacitor) build

Requisitos previos:

- Android Studio + SDK Platform 33+ (o la que Gradle pida)
- Java 17 (JDK 17)

Pasos rápidos:

1. `npm run build`
2. `npm run android:build`
   - Genera `android/app/build/outputs/apk/release/app-release-unsigned.apk`
3. Firma el APK para evitar advertencias al instalar:
   - Crea un keystore si no tienes uno:
     ```powershell
     keytool -genkeypair -v -keystore yut.keystore -alias yut -keyalg RSA -keysize 2048 -validity 3650
     ```
   - Firma y alinea el APK:
     ```powershell
     # Firma (apksigner viene con el SDK de Android)
     $env:PATH+=";${env:ANDROID_HOME}\build-tools\<version>"; apksigner sign --ks yut.keystore android\app\build\outputs\apk\release\app-release-unsigned.apk
     # Verifica la firma
     apksigner verify android\app\build\outputs\apk\release\app-release-unsigned.apk
     ```
   - Alternativa: usa Android Studio > Build > Generate Signed Bundle/APK.

Notas para reducir “APK extraño”:

- ID de app en formato Java sin guiones (por eso `com.salesgestor.ap`).
- Tráfico claro deshabilitado (networkSecurityConfig) y `androidScheme` en https.
- Firma de lanzamiento con keystore propio.

# Deudas & Ventas

App para gestionar deudas y ventas de clientes. Actualizada a Svelte 5 (runes).

Principales cambios:

- Reactividad con $state, $derived y $effect
- Props con $props()
- Eventos como callback props (onclick/onsubmit), sin createEventDispatcher

Desarrollo

- Requisitos: Node 18+
- Scripts: `npm run dev`, `npm run build`, `npm run preview`

## PWA (Instalable en iOS, Android y Escritorio)

La app incluye soporte PWA para instalación desde el navegador.

### Probar local

1. `npm run dev`
2. Abre la URL local (ej: http://localhost:5173)
3. DevTools > Application > Manifest debe mostrar datos válidos.
4. Chrome/Edge: icono de instalar en omnibox.
5. Safari iOS: Compartir > Agregar a pantalla de inicio.

### Archivos clave

- `public/manifest.webmanifest`
- `public/sw.js`
- `index.html`
- `src/main.ts`

### Consejos

- Ya no es necesario cambiar manualmente `CACHE_NAME`; el Service Worker se versiona automáticamente.
- Añade más tamaños de íconos si los necesitas (ej: 192, 256, 384, 512 maskable).
- iOS no soporta `beforeinstallprompt`; proceso manual.

### Actualización automática forzada (Versionado SW)

Cada build inyecta una variable `import.meta.env.VITE_APP_VERSION` construida con:

`<hash-corto-git>-<timestamp YYYYMMDDHHMMSS>`

Esta versión se añade como query param al registrar el Service Worker: `sw.js?v=HASH-TIME`.

El propio `sw.js`:

- Usa el parámetro `v` para crear un `CACHE_NAME` único (`ventas-cache-<versión>`).
- Elimina caches antiguos durante `activate`.
- Llama a `skipWaiting` (vía mensaje) y al tomar control dispara un `controllerchange` que fuerza `window.location.reload()` (en `src/main.ts`).

Resultado: al desplegar (nuevo commit + build) todos los clientes obtienen la nueva versión sin intervención del usuario en cuanto la pestaña se vuelve activa y el SW se actualiza.

#### Flujo

1. Haces commit / push.
2. Build genera nueva versión y despliegas.
3. El navegador detecta hash nuevo (URL diferente del SW) y descarga el SW actualizado.
4. Nuevo SW instala, limpia caches viejos, y se activa.
5. La app recarga automáticamente con los assets frescos.

#### Notas

- En desarrollo (`npm run dev`) se desregistran SW previos y se borran caches (`ventas-cache*`).
- Si no hay git disponible (ej: build en CI shallow) se usa `dev` como hash + timestamp.
- Puedes mostrar la versión dentro de la UI leyendo `import.meta.env.VITE_APP_VERSION`.

Ejemplo para mostrar versión en un componente Svelte:

```svelte
<script>
  const version = (import.meta as any).env.VITE_APP_VERSION;
</script>

<footer class="text-xs opacity-60">v {version}</footer>
```
