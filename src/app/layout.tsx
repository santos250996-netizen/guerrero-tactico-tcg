import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
