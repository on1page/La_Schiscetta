import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://laschiscetta.example.it";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "La Schiscetta | Ristorante di Nutrizione di Precisione a Cagliari",
    template: "%s | La Schiscetta Cagliari",
  },
  description:
    "Ristorante fast-casuale di nutrizione di precisione a Cagliari: menu con valori nutrizionali per 100 g, prezzo al peso €/100 g, allergeni dichiarati, smoothie proteici, delivery e catering salutare. Ordina online.",
  keywords: [
    "ristorante salute Cagliari",
    "mangiare sano Cagliari",
    "delivery sano Cagliari",
    "pranzo ufficio sano Cagliari",
    "smoothie proteici Cagliari",
    "precision nutrition Italia",
    "bowl proteica Cagliari",
    "catering salute Cagliari",
    "pranzo fitness Cagliari",
    "nutrizione di precisione Sardegna",
  ],
  authors: [{ name: "La Schiscetta" }],
  alternates: {
    canonical: "/",
    languages: { "it-IT": "/", "en-US": "/?lang=en" },
  },
  openGraph: {
    title: "La Schiscetta | Nutrizione di Precisione a Cagliari",
    description:
      "Il tuo chef privato incontra il tuo nutrizionista. Piatti personalizzabili al grammo, valori nutrizionali dichiarati, prezzo al peso. Via Roma 100, Cagliari.",
    url: SITE_URL,
    siteName: "La Schiscetta",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "La Schiscetta | Nutrizione di Precisione a Cagliari",
    description:
      "Piatti personalizzabili al grammo, valori nutrizionali dichiarati, prezzo al peso €/100 g.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "Food & Drink",
};

export const viewport: Viewport = {
  themeColor: "#3E5233",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CSP nonce-based: la lettura di headers() rende il route DINAMICO
  // (obbligatorio: un nonce prerenderizzato statico non coinciderebbe
  // mai con quello generato dal middleware ad ogni richiesta) e Next.js
  // preleva il nonce dalla CSP nei request headers applicandolo ai
  // propri tag <script> inline.
  const nonce = (await headers()).get("x-nonce");

  return (
    <html lang="it" suppressHydrationWarning data-nonce-ready={nonce ? "1" : "0"}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}