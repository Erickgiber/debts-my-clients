// Utilidad para exponer la versión actual de la app
// En build: se usa VITE_APP_VERSION (generado por generate-version.mjs)
// En dev: si no existe VITE_APP_VERSION, se intenta leer de package.json via import.meta.glob

// Nota: import.meta.glob solo funciona con archivos dentro del árbol de Vite. package.json está en root.
// Usamos una petición fetch sobre la raíz solo en modo desarrollo.

export let APP_VERSION = (import.meta as any).env?.VITE_APP_VERSION || 'dev';

async function tryLoadPkgVersionDev() {
  if (APP_VERSION !== 'dev') return APP_VERSION;
  try {
    const res = await fetch('/package.json', { cache: 'no-store' });
    if (!res.ok) return APP_VERSION;
    const pkg = await res.json();
    if (pkg?.version) {
      APP_VERSION = pkg.version + '-dev';
    }
  } catch {
    // ignore
  }
  return APP_VERSION;
}

export function initAppVersion() {
  // Dev: intentar sobreescribir con package.json
  if (!(import.meta as any).env.PROD) {
    tryLoadPkgVersionDev();
  }
  return APP_VERSION;
}
