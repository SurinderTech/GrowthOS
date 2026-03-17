// app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrowthOS – Your Digital Silicon Valley",
  description: "The all-in-one operating system for ambitious businesses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>

          {/* Global Navbar */}
          <Navbar />

          {/* Page Content */}
          <main style={{ paddingTop: "72px" }}>
            {children}
          </main>

          {/* Global Toast Notifications */}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#0d1f3c",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "10px",
                fontSize: "0.88rem",
              },
              success: {
                iconTheme: { primary: "#2196f3", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "#ff6b00", secondary: "#fff" },
              },
            }}
          />
          
        </AuthProvider>
      </body>
    </html>
  );
}