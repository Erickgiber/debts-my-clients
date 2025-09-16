import { writable } from 'svelte/store';

// Tipo de modo de la aplicación
export type AppMode = 'sales' | 'debts';

const MODE_KEY = 'app-mode-v1';

function loadInitial(): AppMode {
  if (typeof localStorage === 'undefined') return 'sales';
  const val = localStorage.getItem(MODE_KEY);
  return val === 'debts' ? 'debts' : 'sales';
}

export const appMode = writable<AppMode>(loadInitial());

appMode.subscribe((m) => {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {}
});

// Helper para derivar textos según modo (pequeña centralización)
export function modeText<T = string>(mode: AppMode, map: { sales: T; debts: T }): T {
  return mode === 'debts' ? map.debts : map.sales;
}
