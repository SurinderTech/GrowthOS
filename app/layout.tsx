// src/app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
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