"use client";

import type { Call, Device } from "@twilio/voice-sdk";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type VoiceDeviceState = "loading" | "offline" | "registered" | "error";
export type VoiceCallState =
  | "idle"
  | "incoming"
  | "connecting"
  | "ringing"
  | "connected"
  | "reconnecting";

type VoiceContextValue = {
  deviceState: VoiceDeviceState;
  callState: VoiceCallState;
  activeCall: Call | null;
  remoteNumber: string;
  isMuted: boolean;
  error: string | null;
  startCall: (phoneNumber: string) => Promise<void>;
  answerCall: () => void;
  rejectCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  sendDigits: (digits: string) => void;
  clearError: () => void;
};

const TwilioVoiceContext = createContext<VoiceContextValue | null>(null);
const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

type TokenResponse = {
  token?: string;
  error?: string;
};

async function fetchVoiceToken(): Promise<string> {
  const response = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const result = (await response.json()) as TokenResponse;
  if (!response.ok || !result.token) {
    throw new Error(result.error ?? "No se pudo obtener el token de voz.");
  }

  return result.token;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error de telefonía.";
}

export function TwilioVoiceProvider({ children }: { children: ReactNode }) {
  const deviceRef = useRef<Device | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const [deviceState, setDeviceState] = useState<VoiceDeviceState>("loading");
  const [callState, setCallState] = useState<VoiceCallState>("idle");
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [remoteNumber, setRemoteNumber] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearActiveCall = useCallback((call: Call) => {
    if (activeCallRef.current !== call) {
      return;
    }

    activeCallRef.current = null;
    setActiveCall(null);
    setCallState("idle");
    setRemoteNumber("");
    setIsMuted(false);
  }, []);

  const bindCall = useCallback(
    (call: Call, number: string) => {
      activeCallRef.current = call;
      setActiveCall(call);
      setRemoteNumber(number);
      setIsMuted(call.isMuted());
      setError(null);
      setCallState(call.direction === "INCOMING" ? "incoming" : "connecting");

      call.on("accept", () => setCallState("connected"));
      call.on("ringing", () => setCallState("ringing"));
      call.on("reconnecting", () => setCallState("reconnecting"));
      call.on("reconnected", () => setCallState("connected"));
      call.on("mute", (muted: boolean) => setIsMuted(muted));
      call.on("disconnect", () => clearActiveCall(call));
      call.on("cancel", () => clearActiveCall(call));
      call.on("reject", () => clearActiveCall(call));
      call.on("error", (callError: Error) => {
        setError(getErrorMessage(callError));
        clearActiveCall(call);
      });
    },
    [clearActiveCall],
  );

  useEffect(() => {
    let mounted = true;

    async function initializeDevice() {
      setDeviceState("loading");
      try {
        const token = await fetchVoiceToken();
        const { Call: VoiceCall, Device: VoiceDevice } = await import(
          "@twilio/voice-sdk"
        );
        if (!mounted) {
          return;
        }
        if (!VoiceDevice.isSupported) {
          throw new Error("Este navegador no es compatible con llamadas WebRTC.");
        }

        const device = new VoiceDevice(token, {
          appName: "CybrDial",
          appVersion: "1.0.0",
          closeProtection: true,
          codecPreferences: [VoiceCall.Codec.Opus, VoiceCall.Codec.PCMU],
          logLevel: process.env.NODE_ENV === "development" ? 1 : 4,
        });
        deviceRef.current = device;

        device.on("registered", () => {
          setDeviceState("registered");
          setError(null);
        });
        device.on("unregistered", () => setDeviceState("offline"));
        device.on("error", (deviceError: Error) => {
          setDeviceState("error");
          setError(getErrorMessage(deviceError));
        });
        device.on("incoming", (call: Call) => {
          const caller = call.parameters.From ?? call.parameters.Caller ?? "";
          if (activeCallRef.current) {
            call.reject();
            return;
          }
          bindCall(call, caller);
        });
        device.on("tokenWillExpire", async () => {
          try {
            const refreshedToken = await fetchVoiceToken();
            if (mounted) {
              device.updateToken(refreshedToken);
            }
          } catch (tokenError) {
            if (mounted) {
              setError(getErrorMessage(tokenError));
            }
          }
        });

        await device.register();
      } catch (deviceError) {
        if (mounted) {
          setDeviceState("error");
          setError(getErrorMessage(deviceError));
        }
      }
    }

    if (typeof window !== "undefined") {
      void initializeDevice();
    }

    return () => {
      mounted = false;
      activeCallRef.current?.disconnect();
      activeCallRef.current = null;
      deviceRef.current?.destroy();
      deviceRef.current = null;
    };
  }, [bindCall]);

  const startCall = useCallback(
    async (phoneNumber: string) => {
      const destination = phoneNumber.trim();
      if (!E164_PATTERN.test(destination)) {
        setError("Ingresa un número telefónico en formato E.164.");
        return;
      }
      const device = deviceRef.current;
      if (!device || deviceState !== "registered") {
        setError("El teléfono todavía no está conectado a Twilio.");
        return;
      }
      if (activeCallRef.current) {
        setError("Finaliza la llamada actual antes de iniciar otra.");
        return;
      }

      setError(null);
      setCallState("connecting");
      setRemoteNumber(destination);
      try {
        const call = await device.connect({ params: { To: destination } });
        bindCall(call, destination);
      } catch (callError) {
        setCallState("idle");
        setRemoteNumber("");
        setError(getErrorMessage(callError));
      }
    },
    [bindCall, deviceState],
  );

  const answerCall = useCallback(() => {
    if (callState === "incoming") {
      activeCallRef.current?.accept();
      setCallState("connecting");
    }
  }, [callState]);

  const rejectCall = useCallback(() => {
    if (callState === "incoming") {
      activeCallRef.current?.reject();
      setCallState("idle");
    }
  }, [callState]);

  const hangUp = useCallback(() => {
    activeCallRef.current?.disconnect();
  }, []);

  const toggleMute = useCallback(() => {
    const call = activeCallRef.current;
    if (!call || callState === "incoming") {
      return;
    }

    const nextMutedState = !call.isMuted();
    call.mute(nextMutedState);
    setIsMuted(nextMutedState);
  }, [callState]);

  const sendDigits = useCallback(
    (digits: string) => {
      if (!/^[0-9*#]+$/.test(digits) || !activeCallRef.current) {
        return;
      }
      activeCallRef.current.sendDigits(digits);
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<VoiceContextValue>(
    () => ({
      deviceState,
      callState,
      activeCall,
      remoteNumber,
      isMuted,
      error,
      startCall,
      answerCall,
      rejectCall,
      hangUp,
      toggleMute,
      sendDigits,
      clearError,
    }),
    [
      deviceState,
      callState,
      activeCall,
      remoteNumber,
      isMuted,
      error,
      startCall,
      answerCall,
      rejectCall,
      hangUp,
      toggleMute,
      sendDigits,
      clearError,
    ],
  );

  return (
    <TwilioVoiceContext.Provider value={value}>
      {children}
    </TwilioVoiceContext.Provider>
  );
}

export function useTwilioVoice(): VoiceContextValue {
  const context = useContext(TwilioVoiceContext);
  if (!context) {
    throw new Error(
      "useTwilioVoice debe usarse dentro de TwilioVoiceProvider.",
    );
  }

  return context;
}
