import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.salesgestor.app',
  appName: 'Gestor de ventas',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
}

export default config
