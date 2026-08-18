// src/app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AppShell } from "@/components/layout/AppShell";
import { NeuralGrid } from "@/components/ui/NeuralGrid";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>GrowthOS – Your Digital Silicon Valley</title>
        <meta name="description" content="The all-in-one operating system for ambitious businesses." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Nova AI Botpress Webchat Integration */}
        <Script
          src="https://cdn.botpress.cloud/webchat/v5.0/inject.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://files.bpcontent.cloud/2026/08/17/15/20260817152735-O9AWKARL.js"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ 
          background: "#050709", 
          color: "white",
          overflowX: "hidden"
        }}
      >
        {/* Neural Grid Background - Visible on ALL sections */}
        <NeuralGrid />
        
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}