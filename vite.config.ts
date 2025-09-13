import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';

// Obtener hash corto de git y timestamp para versión única de assets y SW
function computeVersion() {
  let hash = 'dev';
  try {
    hash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    // ignorar si no hay git (ej: CI sin fetch completo)
  }
  const ts = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14); // YYYYMMDDHHMMSS
  return `${hash}-${ts}`;
}
const APP_VERSION = computeVersion();

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  resolve: {
    alias: {
      $lib: '/src/lib',
    },
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
  },
});
