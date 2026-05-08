import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "785 Tickets",
    template: "%s | 785 Tickets",
  },
  description: "Community-driven event ticketing for the Wichita 785 scene.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "785 Tickets",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "785 Tickets",
    title: "785 Tickets",
    description: "Community-driven event ticketing for the Wichita 785 scene.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFCE03",
  width: "device-width",
  initialScale: 1,
  maximumScale:1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable}`}>
      <body className="bg-brand-black text-brand-white font-body antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
