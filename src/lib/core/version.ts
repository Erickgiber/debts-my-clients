// $lib/core/version.ts
import pkg from '../../../package.json';

export const APP_VERSION: string = pkg.version;

/**
 * Inicializa y devuelve la versión de la aplicación.
 * @returns {string} La versión actual de la app.
 */
export function initAppVersion(): string {
  return APP_VERSION;
}
