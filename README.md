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

Cada build genera un archivo `.env.production.local` (ignorando por git) con la variable `VITE_APP_VERSION` construida así:

`<version-package.json>-<hash-git-corto>-<timestamp YYYYMMDDHHMMSS>`

Ejemplo: `0.1.3-a1b2c3d-20250913174522`.

El script `scripts/generate-version.mjs` se ejecuta automáticamente vía `npm run build` (hook `prebuild`). Si por alguna razón quieres regenerar manualmente solo la versión:

```powershell
node scripts/generate-version.mjs
```

La versión se añade como query param al registrar el Service Worker: `sw.js?v=<VITE_APP_VERSION>`.

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
6. Estrategia de navegación: `index.html` ahora es network-first (si hay conexión) para detectar builds nuevas inmediatamente y solo cae a cache si estás offline.

#### Notas

- En desarrollo (`npm run dev`) se desregistran SW previos y se borran caches (`ventas-cache*`).
- Si no hay git disponible (ej: build en CI shallow) se usa `nogit` como hash.
- Puedes mostrar la versión dentro de la UI leyendo `import.meta.env.VITE_APP_VERSION`.

Ejemplo para mostrar versión en un componente Svelte:

```svelte
<script>
  const version = (import.meta as any).env.VITE_APP_VERSION;
</script>

<footer class="text-xs opacity-60">v {version}</footer>
```

### Versionado semántico automático (commit-msg + tags)

El hook `commit-msg` aplica bump semántico, enmienda el commit y genera un tag `vX.Y.Z`.

Herramienta: `scripts/semver-bump.mjs` + hook `.husky/commit-msg`.

Reglas:

- `BREAKING CHANGE:` en el cuerpo o `tipo!:` en el encabezado → bump MAJOR (x.0.0)
- `feat:` / `feat(scope):` → bump MINOR (aumenta y resetea patch)
- `fix:` / `perf:` / `release:` → bump PATCH
- Otros tipos (`docs`, `chore`, `refactor`, etc.) no cambian versión (a menos que usen `!:`)

Ejemplos:

| Mensaje commit                        | Versión 1.2.3 → |
| ------------------------------------- | --------------- |
| `feat: agregar reporte PDF`           | 1.3.0           |
| `fix(ui): corregir overflow`          | 1.2.4           |
| `feat!: reescritura estructura datos` | 2.0.0           |
| `refactor: limpiar utils`             | 1.2.3           |

Notas:

1. Usa `git commit -m "feat: ..."` para asegurar el bump; si abres editor igual funciona (lee el archivo del mensaje).
2. Para forzar un bump manual:

```powershell
node scripts/semver-bump.mjs .git/COMMIT_EDITMSG --force minor
```

3. Se crea tag anotado `v<version>` si no existe; exporta `PUSH_TAG=1` para hacer `git push --follow-tags` automáticamente.

Instalación Husky (ya configurado tras `npm install`):

```powershell
npm install
```

Hook: `.husky/commit-msg` → ejecuta el bump, enmienda y crea tag. Si el mensaje NO provoca bump (por ejemplo `refactor:`) el hook fuerza por defecto un bump `patch` usando `--force ${DEFAULT_BUMP:-patch}` para garantizar que cada commit en `main` avance la versión. Puedes sobrescribir exportando temporalmente `DEFAULT_BUMP=minor` o `DEFAULT_BUMP=major` antes del commit:

```powershell
$env:DEFAULT_BUMP="minor"; git commit -m "docs: actualizar readme"; Remove-Item Env:\DEFAULT_BUMP
```

Si quieres desactivar el force patch, edita `.husky/commit-msg` y elimina `--force ${DEFAULT_BUMP:-patch}`.

Visualización de versión dentro de la app:

Se añadió `src/lib/core/version.ts` que expone `APP_VERSION`.

- En producción proviene de `VITE_APP_VERSION`.
- En desarrollo intenta leer `package.json` (fetch) y añade sufijo `-dev`.

`App.svelte` ahora muestra un badge discreto (abajo a la derecha) con `v<versión>` y se registra en `localStorage` la versión previa para comparar avisos de actualización.

Si no deseas este comportamiento, elimina `.husky/commit-msg` y la dependencia `husky`, y borra el uso de `version.ts` y el badge en `App.svelte`.

### Workflow GitHub: Auto bump en main

Archivo: `.github/workflows/version-bump.yml`.

Cuando haces push a `main`:

1. Lee el último mensaje de commit.
2. Decide bump (mismas reglas básicas feat/fix/perf/breaking).
3. Si aplica, incrementa `package.json`, crea commit `ci: bump version to X.Y.Z` y tag `vX.Y.Z`.
4. Empuja cambios + tags.

Esto asegura que aunque un commit pase sin hook local, el repo central mantenga versión y tag consistentes.

Desactivar: elimina el workflow o limita las ramas en el YAML.

### Toast de actualización interactivo

Cuando se activa un nuevo Service Worker:

- Aparece un panel inferior con el mensaje: “Se ha detectado una nueva versión…”.
- Botón “Actualizar ahora” fuerza `window.location.reload()`.
- Botón “Más tarde” cierra el panel (seguirás con la versión vieja hasta recargar o nueva activación).

Cambiar estilos: editar `src/lib/core/toast.ts` (clases Tailwind).
