import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display, Orbitron, Pacifico, Quicksand, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  weight: "400",
  subsets: ["latin"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://nexusrd.do'),
  title: {
    default: 'Nexus',
    template: '%s | Nexus',
  },
  description: 'Tu tienda online en República Dominicana. Catálogo digital, pedidos por WhatsApp e inventario, sin saber de tecnología.',
  keywords: ['tienda online', 'catálogo digital', 'WhatsApp', 'República Dominicana', 'ecommerce', 'inventario', 'pedidos'],
  icons: { icon: '/api/favicon' },
  openGraph: {
    type: 'website',
    siteName: 'Nexus',
    title: 'Nexus — Tu negocio merece estar online',
    description: 'Crea tu catálogo digital en minutos, sin saber de tecnología. Solo subes tus fotos y compartes tu link.',
    locale: 'es_DO',
    images: [{ url: '/pwa-icon-512.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexus — Tu negocio merece estar online',
    description: 'Crea tu catálogo digital en minutos, sin saber de tecnología.',
    images: [{ url: '/pwa-icon-512.png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable} ${orbitron.variable} ${pacifico.variable} ${quicksand.variable} ${bebas.variable} h-full antialiased`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function(){
              try {
                var t = localStorage.getItem('nexus-theme');
                if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch(e){}
            })();
          `
        }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}