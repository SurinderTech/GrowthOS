"use client";

// components/auth/MSG91OTPWidget.tsx
// Reusable MSG91 OTP Widget component for phone-number OTP authentication.

import { useState, useCallback } from "react";
import { Phone, Loader2, ShieldCheck } from "lucide-react";
import { loadMSG91Script } from "@/lib/msg91-widget";

interface MSG91OTPWidgetProps {
  onSuccess: (accessToken: string) => void;
  onFailure?: (errorMsg: string) => void;
  phone?: string;
  buttonText?: string;
  disabled?: boolean;
}

export function MSG91OTPWidget({
  onSuccess,
  onFailure,
  phone = "",
  buttonText = "VERIFY WITH MSG91 PHONE OTP",
  disabled = false,
}: MSG91OTPWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launchWidget = useCallback(async () => {
    setLoading(true);
    setError(null);

    const widgetId = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID || "366870725768383630303131";
    const tokenAuth = process.env.NEXT_PUBLIC_MSG91_WIDGET_TOKEN || "561208TAcyaZNmn6a81b73cP1";

    try {
      const configuration = {
        widgetId,
        tokenAuth,
        identifier: phone ? phone.trim() : undefined,
        exposeMethods: true,
        success: (data: any) => {
          setLoading(false);
          // Extract MSG91 access token from response callback
          const accessToken = typeof data === "string" ? data : (data?.message || data?.jwt || data?.token || data?.["access-token"] || data?.access_token);
          if (typeof accessToken === "string" && accessToken.trim()) {
            onSuccess(accessToken.trim());
          } else {
            const err = "No access token received from MSG91 OTP widget.";
            setError(err);
            if (onFailure) onFailure(err);
          }
        },
        failure: (errObj: any) => {
          setLoading(false);
          const errMsg = errObj?.message || errObj?.reason || "MSG91 OTP verification failed.";
          setError(String(errMsg));
          if (onFailure) onFailure(String(errMsg));
        },
      };

      // Set global configuration object expected by MSG91 script
      window.configuration = configuration;

      const scriptLoaded = await loadMSG91Script();
      if (!scriptLoaded) {
        const err = "Failed to load MSG91 OTP widget script. Please check your network connection.";
        setError(err);
        if (onFailure) onFailure(err);
        setLoading(false);
        return;
      }

      if (typeof window.initSendOTP === "function") {
        window.initSendOTP(configuration);
      }

      // If exposeMethods is true and sendOtp method exists, launch for phone if provided
      if (typeof window.sendOtp === "function" && phone) {
        window.sendOtp(phone.trim());
      }

    } catch (e: any) {
      setLoading(false);
      const errMsg = e.message || "An error occurred while launching MSG91 OTP widget.";
      setError(errMsg);
      if (onFailure) onFailure(errMsg);
    }
  }, [phone, onSuccess, onFailure]);

  return (
    <div style={{ width: "100%" }}>
      <button
        type="button"
        onClick={launchWidget}
        disabled={disabled || loading}
        style={{
          width: "100%",
          padding: "13px 18px",
          background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
          border: "none",
          borderRadius: "12px",
          color: "#ffffff",
          fontSize: "0.88rem",
          fontWeight: 800,
          letterSpacing: "0.04em",
          cursor: disabled || loading ? "not-allowed" : "pointer",
          opacity: disabled || loading ? 0.7 : 1,
          boxShadow: "0 10px 25px rgba(6, 182, 212, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          transition: "all 0.2s ease",
        }}
      >
        {loading ? (
          <>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span>INITIALIZING MSG91 OTP...</span>
          </>
        ) : (
          <>
            <Phone size={18} />
            <span>{buttonText}</span>
          </>
        )}
      </button>

      {error && (
        <div style={{ fontSize: "0.78rem", color: "#f87171", marginTop: "8px", textAlign: "center" }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default MSG91OTPWidget;
