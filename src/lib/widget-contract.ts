export type WidgetAuthState = "authenticated" | "unauthenticated";

export type WidgetMessage =
  | { type: "cybrdial:init"; hostOrigin: string; theme?: "dark" | "light" }
  | { type: "cybrdial:dial"; number: string }
  | { type: "cybrdial:minimize" }
  | { type: "cybrdial:expand" }
  | { type: "cybrdial:close" }
  | { type: "cybrdial:ready" }
  | { type: "cybrdial:auth-state"; authenticated: boolean }
  | {
      type: "cybrdial:call-state";
      deviceState: string;
      callState: string;
      remoteNumber: string;
      isMuted: boolean;
      isHeld: boolean;
    }
  | { type: "cybrdial:error"; code?: number; message: string };
