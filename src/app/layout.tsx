import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { BackButtonBridge } from "@/components/native/BackButtonBridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cinzel — Roman-inscription style serif, evokes fantasy tactical RPG branding
// (used for the 'JUGAR' button and other display-type labels in the menu UI)
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

// viewport-fit=cover → habilita env(safe-area-inset-*) para respetar las
// zonas seguras del móvil (notch, barra de gestos). userScalable=false evita
// zooms accidentales al tocar rápido durante una partida.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Pacto de Guerra",
  description:
    "Juego de cartas táctico inspirado en WoW TCG: gestiona tu energía, juega cartas en 3 carriles y vence al rival.",
  keywords: [
    "WoW TCG",
    "Guerrero",
    "Card Game",
    "Táctico",
    "Next.js",
    "TypeScript",
  ],
  authors: [{ name: "Z.ai" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Pacto de Guerra",
    description: "Juego de cartas táctico inspirado en WoW TCG.",
    url: "https://chat.z.ai",
    siteName: "Z.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pacto de Guerra",
    description: "Juego de cartas táctico inspirado en WoW TCG.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} antialiased bg-background text-foreground`}
      >
        {/* Preload del fondo del menú (LCP): es CSS background → sin preload
            el navegador lo descubre tarde. React 19 lo iza al <head>. */}
        <link rel="preload" as="image" href="/menu/main-bg.webp" />
        {/* Traduce el botón "atrás" de Android a navegación interna de la app
            (solo activo en el APK nativo; en navegador no-op). */}
        <BackButtonBridge />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
