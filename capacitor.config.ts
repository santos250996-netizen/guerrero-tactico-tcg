import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pacto.guerra',
  appName: 'Pacto de Guerra',
  webDir: 'out',
  // PvP offline por hotspot: el webview sirve la app desde http://localhost
  // (localhost es contexto seguro) para poder hacer fetch http:// a la IP del
  // anfitrión sin mixed content. NOTA: cambia el origen → localStorage se resetea.
  server: { androidScheme: 'http' },
  android: { allowMixedContent: true },
};

export default config;
