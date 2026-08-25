"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { NovaProvider } from "@/context/NovaContext";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/ui/Navbar";
import { NovaStickyWidget } from "@/components/ui/NovaStickyWidget";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNavbar =
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname?.startsWith("/auth");

  return (
    <ThemeProvider>
      <AuthProvider>
        <NovaProvider>
          {showNavbar && <Navbar />}
          <main style={{ position: "relative", zIndex: 2, paddingTop: showNavbar ? "104px" : "0px", minHeight: "100vh" }}>
            {children}
          </main>
          {/* GrowthOS Advanced NOVA Sticky Floating AI Widget */}
          <NovaStickyWidget />
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
        </NovaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}


