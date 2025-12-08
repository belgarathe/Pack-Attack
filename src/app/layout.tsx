import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { Navigation } from "@/components/Navigation";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#030712" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
  ],
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Pack Attack - Magic: The Gathering Box Battles",
  description: "Experience the thrill of opening boxes and competing in battles",
  applicationName: "Pack Attack",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pack Attack",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#030712",
    "msapplication-tap-highlight": "no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external resources for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external APIs */}
        <link rel="dns-prefetch" href="https://api.scryfall.com" />
        
        {/* Touch icons for various devices */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        
        {/* Manifest for PWA */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* IE/Edge compatibility */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      </head>
      <body className="antialiased">
        <Providers>
          <Navigation />
          <main id="main-content" className="safe-area-padding-bottom">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
