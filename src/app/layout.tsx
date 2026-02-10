import type { Metadata, Viewport } from "next";
import { Outfit, Syne } from "next/font/google";
import { Providers } from "./providers";
import { Navigation } from "@/components/Navigation";
import { ChatPanel } from "@/components/ChatPanel";
import "./globals.css";

// Next.js font optimization - self-hosted, no render-blocking external requests
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-outfit",
  preload: true,
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-syne",
  preload: true,
});

/**
 * Viewport configuration optimized for all devices
 * - Mobile phones (iOS, Android)
 * - Tablets (iPad, Android tablets)
 * - Desktop browsers (Chrome, Firefox, Safari, Edge)
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow zoom for accessibility (WCAG 2.1) but limit to reasonable range
  minimumScale: 1,
  maximumScale: 3,
  userScalable: true,
  // Theme color for browser chrome - matches dark theme
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#030712" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
  ],
  // Support notched devices (iPhone X+, Android with cutouts)
  viewportFit: "cover",
  // Color scheme for browser UI elements
  colorScheme: "dark",
  // Interactive widget behavior (for virtual keyboard on mobile)
  interactiveWidget: "resizes-content",
};

/**
 * Metadata configuration for SEO and cross-browser/device compatibility
 */
export const metadata: Metadata = {
  title: {
    default: "Pack Attack - Trading Card Box Battles",
    template: "%s | Pack Attack",
  },
  description: "Experience the thrill of opening trading card boxes and competing in battles. Support for Magic: The Gathering, Pokemon, One Piece, and Lorcana.",
  applicationName: "Pack Attack",
  // Keywords for SEO
  keywords: [
    "trading cards",
    "MTG",
    "Pokemon",
    "One Piece",
    "Lorcana",
    "box battles",
    "pack opening",
  ],
  // Author information
  authors: [{ name: "Pack Attack Team" }],
  creator: "Pack Attack",
  publisher: "Pack Attack",
  // Robots directive
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Apple Web App configuration (iOS Safari)
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pack Attack",
    // Startup images for iOS (optional, improves perceived load time)
    startupImage: [
      {
        url: "/splash/apple-splash-2048-2732.png",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1668-2388.png",
        media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1536-2048.png",
        media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-1125-2436.png",
        media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-1242-2688.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/splash/apple-splash-750-1334.png",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/splash/apple-splash-640-1136.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  // Disable automatic phone number detection
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  // Open Graph for social sharing
  openGraph: {
    type: "website",
    siteName: "Pack Attack",
    title: "Pack Attack - Trading Card Box Battles",
    description: "Experience the thrill of opening trading card boxes and competing in battles.",
    locale: "en_US",
  },
  // Twitter/X card
  twitter: {
    card: "summary_large_image",
    title: "Pack Attack - Trading Card Box Battles",
    description: "Experience the thrill of opening trading card boxes and competing in battles.",
  },
  // Additional browser/platform-specific settings
  other: {
    // Android Chrome
    "mobile-web-app-capable": "yes",
    // Microsoft Edge/IE
    "msapplication-TileColor": "#030712",
    "msapplication-tap-highlight": "no",
    "msapplication-config": "/browserconfig.xml",
    // Samsung Internet
    "theme-color": "#030712",
    // UC Browser
    "screen-orientation": "portrait",
    // Opera Mini
    "x-dns-prefetch-control": "on",
    // Disable translation prompt
    "google": "notranslate",
  },
  // Manifest link for PWA
  manifest: "/manifest.json",
  // Icons configuration
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  // Category for app stores
  category: "games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`scroll-smooth ${outfit.variable} ${syne.variable}`}>
      <head>
        {/* Preconnect to card image CDNs for faster loading */}
        <link rel="preconnect" href="https://cards.scryfall.io" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.pokemontcg.io" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external APIs - improves connection time */}
        <link rel="dns-prefetch" href="https://api.scryfall.com" />
        <link rel="dns-prefetch" href="https://api.pokemontcg.io" />
        <link rel="dns-prefetch" href="https://db.ygoprodeck.com" />
        <link rel="dns-prefetch" href="https://api.lorcana-api.com" />
        <link rel="dns-prefetch" href="https://optcgapi.com" />
        <link rel="dns-prefetch" href="https://api.justtcg.com" />
        <link rel="dns-prefetch" href="https://api.fabdb.net" />
        <link rel="preconnect" href="https://optcgapi.com" crossOrigin="anonymous" />
        
        {/* Touch icons for iOS devices */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png" />
        
        {/* Favicons for various browsers */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        
        {/* Android Chrome icons */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        
        {/* Manifest for PWA - enables Add to Home Screen */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Safari pinned tab icon */}
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#3b82f6" />
        
        {/* Microsoft browserconfig for tiles */}
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* IE/Edge compatibility mode */}
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        
        {/* Prevent iOS from detecting phone numbers as links */}
        <meta name="format-detection" content="telephone=no" />
        
        {/* Disable automatic translation prompts */}
        <meta name="google" content="notranslate" />
      </head>
      <body 
        className="antialiased font-display"
        // Prevent pull-to-refresh on mobile when not at top
        style={{ overscrollBehavior: 'none' }}
      >
        <Providers>
          {/* Skip to main content link for accessibility */}
          <a 
            href="#main-content" 
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
          >
            Skip to main content
          </a>
          <Navigation />
          <main 
            id="main-content" 
            className="safe-area-padding-bottom"
            // Improve touch scrolling
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {children}
          </main>
          <ChatPanel />
        </Providers>
      </body>
    </html>
  );
}
