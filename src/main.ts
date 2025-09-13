import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;

// Service Worker handling
// Solo registrar el SW en producción para evitar cache en desarrollo.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
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
