import type { Metadata, Viewport } from "next";
import "./globals.css";

import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "Nails",
  description: "Календар записів на манікюр",

  applicationName: "Nails",

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "Nails",
    statusBarStyle: "default",
  },

  icons: {
    icon: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],

    apple: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fcecef",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className="m-0 bg-[#fcecef]">
        <PwaRegister />

        {children}
      </body>
    </html>
  );
}