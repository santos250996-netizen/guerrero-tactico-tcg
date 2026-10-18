import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pacto.guerra',
  appName: 'Pacto de Guerra',
  webDir: 'out',
  // PvP offline por hotspot: el webview sirve la app desde http://localhost
  // (localhost es contexto seguro) para poder hacer fetch http:// a la IP del
  // anfitrión sin mixed content. NOTA: cambia el origen → localStorage se resetea.
  server: { androidScheme: 'http' },
  android: {
    allowMixedContent: true,
    // Android 15+ (targetSdk 35/36) fuerza edge-to-edge: el WebView se dibuja
    // BAJO la barra de estado y la barra de navegación, tapando los botones de
    // PASAR/carriles. Con "force" Capacitor aplica márgenes al WebView iguales
    // a los insets del sistema → el juego queda SIEMPRE dentro del área util.
    adjustMarginsForEdgeToEdge: 'force',
  },
};

export default config;
