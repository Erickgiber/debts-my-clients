import { mount } from 'svelte';
import { showUpdatingToast } from '$lib/core/toast';
import { initAppVersion, APP_VERSION } from '$lib/core/version';
import './app.css';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;

// Service Worker handling
// Solo registrar el SW en producción para evitar cache en desarrollo.
if ('serviceWorker' in navigator) {
  const currentVersion = initAppVersion();
  const prevVersion = localStorage.getItem('app_version');
  if (prevVersion !== currentVersion) {
    localStorage.setItem('app_version', currentVersion);
    console.info(`[version] Version actual: ${currentVersion} (previa: ${prevVersion || 'none'})`);
  }
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      const swUrl = `/sw.js?v=${encodeURIComponent(currentVersion)}`;
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          // Escuchar actualizaciones del SW
          if (reg.waiting) {
            // Hay una versión esperando: forzar skipWaiting + reload
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            // Mostrar toast interactivo para que el usuario decida cuándo recargar
            showUpdatingToast(prevVersion || currentVersion, currentVersion, () => {
              window.location.reload();
            });
          });
        })
        .catch((err) => console.warn('SW registration failed', err));
    });
  } else {
    // Modo desarrollo: eliminar cualquier SW previo y limpiar caches usados por la app
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) {
        r.unregister().then(() => console.info('[DEV] ServiceWorker unregistered'));
      }
    });
    // Borrar caches de la app (ajustar prefijo si cambias CACHE_NAME en sw.js)
    caches.keys().then((keys) => {
      keys
        .filter((k) => k.startsWith('ventas-cache'))
        .forEach((k) => {
          caches.delete(k).then(() => console.info('[DEV] Cache eliminado:', k));
        });
    });
  }
}

// showUpdatingToast ahora vive en $lib/core/toast.ts
