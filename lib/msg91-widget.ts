// lib/msg91-widget.ts
// Client-side loader and configuration for MSG91 OTP Widget SDK

export interface MSG91WidgetConfig {
  widgetId: string;
  tokenAuth: string;
  identifier?: string;
  exposeMethods?: boolean;
  success: (data: { message?: string; jwt?: string; token?: string; [key: string]: any }) => void;
  failure: (error: { message?: string; [key: string]: any }) => void;
}

declare global {
  interface Window {
    configuration?: MSG91WidgetConfig;
    initSendOTP?: (config: MSG91WidgetConfig) => void;
    sendOtp?: (identifier?: string) => void;
  }
}


const MSG91_SCRIPT_URLS = [
  "https://verify.msg91.com/otp-provider.js",
  "https://verify.phone91.com/otp-provider.js"
];

let scriptLoadingPromise: Promise<boolean> | null = null;

export function loadMSG91Script(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.initSendOTP) {
    return Promise.resolve(true);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve) => {
    let index = 0;

    function attemptLoad() {
      if (index >= MSG91_SCRIPT_URLS.length) {
        scriptLoadingPromise = null;
        resolve(false);
        return;
      }

      const scriptUrl = MSG91_SCRIPT_URLS[index];
      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);

      if (existingScript) {
        if (window.initSendOTP) {
          resolve(true);
          return;
        }
      }

      const script = document.createElement("script");
      script.src = scriptUrl;
      script.type = "text/javascript";
      script.async = true;

      script.onload = () => {
        if (typeof window.initSendOTP === "function") {
          resolve(true);
        } else {
          index++;
          attemptLoad();
        }
      };

      script.onerror = () => {
        index++;
        attemptLoad();
      };

      document.head.appendChild(script);
    }

    attemptLoad();
  });

  return scriptLoadingPromise;
}
