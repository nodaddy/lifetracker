import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Toaster } from "sonner";

import { PwaRegister } from "@/components/pwa/pwa-register";
import { APP_DESCRIPTION, APP_NAME } from "@/config/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080513",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {isDev ? (
          <script
            // Runs from the always-fresh HTML before any cached JS chunk loads,
            // so a stale service worker/cache can never keep serving old code in dev.
            dangerouslySetInnerHTML={{
              __html: `(function(){try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister();});});}if(window.caches&&caches.keys){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k);});});}}catch(e){}})();`,
            }}
          />
        ) : null}
      </head>
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {children}
        <Toaster position="top-right" theme="dark" richColors duration={1500} />
      </body>
    </html>
  );
}
