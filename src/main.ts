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
  const version = (import.meta as any).env.VITE_APP_VERSION || 'dev';
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      const swUrl = `/sw.js?v=${encodeURIComponent(version)}`;
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
            // Mostrar toast de "Actualizando…" y recargar tras breve delay para que el usuario lo vea
            showUpdatingToast(version);
            setTimeout(() => {
              window.location.reload();
            }, 900); // suficiente para leer el toast
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

// --- Toast de actualización ---
function showUpdatingToast(ver: string) {
  // Evitar duplicados
  if (document.getElementById('sw-updating-toast')) return;
  const div = document.createElement('div');
  div.id = 'sw-updating-toast';
  div.textContent = `Actualizando… (v ${ver})`;
  div.className = [
    'fixed',
    'bottom-4',
    'left-1/2',
    '-translate-x-1/2',
    'px-4',
    'py-2',
    'text-xs',
    'font-medium',
    'rounded-full',
    'text-white',
    'shadow-lg',
    'z-[9999]',
    'select-none',
    'bg-zinc-900/95',
    'backdrop-blur',
    'opacity-0',
    'translate-y-2',
    'transition',
    'duration-200',
    'ease-out',
  ].join(' ');
  div.setAttribute('role', 'status');
  div.setAttribute('aria-live', 'polite');
  document.body.appendChild(div);
  requestAnimationFrame(() => {
    div.classList.remove('opacity-0', 'translate-y-2');
    div.classList.add('opacity-100', 'translate-y-0');
  });
}
