"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveToken, saveUser } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

// 🔹 Inner component (actual logic here)
function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");

    if (error) {
      toast.error(decodeURIComponent(error));
      router.push("/login");
      return;
    }

    if (!token) {
      toast.error("Authentication failed — no token received");
      router.push("/login");
      return;
    }

    // Save token
    saveToken(token);

    // Fetch user
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((user) => {
        saveUser(user);
        setUser(user);
        toast.success("Welcome to GrowthOS! 🎉");
        router.push("/dashboard");
      })
      .catch(() => {
        toast.error("Login succeeded but failed to get user info");
        router.push("/dashboard");
      });
  }, []);

  return <Loader />;
}

// 🔹 Loader UI (same as your design)
function Loader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a1628",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "16px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          border: "4px solid rgba(33,150,243,0.2)",
          borderTop: "4px solid #2196f3",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "#b0bec5", fontSize: "0.9rem" }}>
        Completing sign in...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// 🔹 Main export with Suspense (FIX)
export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Loader />}>
      <CallbackInner />
    </Suspense>
  );
}