import { writable } from 'svelte/store';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'app-theme-v1';

function getInitialTheme(): Theme {
  // Solo confiamos en el valor almacenado. Si no existe, usamos 'light'.
  try {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'light';
}

export const theme = writable<Theme>(getInitialTheme());

// persist + apply class
let first = true;
if (typeof window !== 'undefined') {
  function applyMetaTheme(val: Theme) {
    // Cambia meta theme-color para que barras del navegador se adapten.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', val === 'dark' ? '#0f0f11' : '#f8f8f9');
    }
  }

  theme.subscribe((val) => {
    try {
      localStorage.setItem(THEME_KEY, val);
    } catch {}
    const root = document.documentElement;
    if (val === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    applyMetaTheme(val);
    // Debug log (remover cuando funcione):
    // Muestra el valor actual y confirma si la clase está presente.
    if (import.meta.env.DEV) {
      // Usar console.info para no saturar con logs de error.
      console.info('[theme] set ->', val, ' html.hasDark=', root.classList.contains('dark'));
    }
    // Optional: avoid transition flash on first load
    if (first) {
      first = false;
    }
  });
}

export function toggleTheme() {
  theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
}
