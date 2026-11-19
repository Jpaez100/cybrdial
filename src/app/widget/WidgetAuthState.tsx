"use client";

import { useEffect } from "react";

export function WidgetAuthState() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.data?.type !== "cybrdial:init" ||
        typeof event.data.hostOrigin !== "string"
      ) {
        return;
      }
      window.parent.postMessage(
        { type: "cybrdial:auth-state", authenticated: false },
        event.data.hostOrigin,
      );
      window.parent.postMessage(
        { type: "cybrdial:ready" },
        event.data.hostOrigin,
      );
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}
