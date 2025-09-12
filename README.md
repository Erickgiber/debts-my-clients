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
- Cambia `CACHE_NAME` en `sw.js` para forzar actualización.
- Añade más tamaños de íconos si los necesitas (ej: 192, 256, 384, 512 maskable).
- iOS no soporta `beforeinstallprompt`; proceso manual.

