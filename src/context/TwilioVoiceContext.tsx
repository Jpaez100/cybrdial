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
import { normalizeE164PhoneNumber } from "@/lib/phone";

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
  isHeld: boolean;
  error: string | null;
  startCall: (phoneNumber: string) => Promise<void>;
  answerCall: () => void;
  rejectCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  sendDigits: (digits: string) => void;
  clearError: () => void;
  retryDevice: () => Promise<void>;
};

const TwilioVoiceContext = createContext<VoiceContextValue | null>(null);

type TokenResponse = {
  token?: string;
  error?: string;
  details?: string;
};

async function fetchVoiceToken(): Promise<string> {
  const response = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const result = (await response.json()) as TokenResponse;
  if (!response.ok || !result.token) {
    throw new Error(
      [result.error ?? "No se pudo obtener el token de voz.", result.details]
        .filter(Boolean)
        .join(" "),
    );
  }

  return result.token;
}

function getErrorMessage(error: unknown): string {
  const errorRecord = getErrorRecord(error);
  if (!errorRecord) {
    return error instanceof Error
      ? error.message
      : "Ocurrió un error de telefonía.";
  }

  const originalError = getErrorRecord(errorRecord.originalError);
  const code =
    typeof errorRecord.code === "string" ||
    typeof errorRecord.code === "number"
      ? String(errorRecord.code)
      : typeof originalError?.code === "string" ||
          typeof originalError?.code === "number"
        ? String(originalError.code)
        : "";
  const message =
    typeof errorRecord.message === "string"
      ? errorRecord.message
      : typeof originalError?.message === "string"
        ? originalError.message
        : "Twilio rechazó la llamada.";
  const description =
    typeof errorRecord.description === "string"
      ? errorRecord.description
      : typeof originalError?.description === "string"
        ? originalError.description
        : "";
  const explanation =
    typeof errorRecord.explanation === "string"
      ? errorRecord.explanation
      : typeof originalError?.explanation === "string"
        ? originalError.explanation
        : "";
  const solutions = Array.isArray(errorRecord.solutions)
    ? errorRecord.solutions.filter(
        (solution): solution is string => typeof solution === "string",
      )
    : [];
  const trialMessage = /trial|verified|verification/i.test(
    `${message} ${description} ${explanation}`,
  )
    ? " En cuentas Trial, verifica el número de destino en Twilio Console y usa un caller ID permitido."
    : "";
  const detail = [description, explanation, ...solutions]
    .filter((part) => part && part !== message)
    .join(" ");

  return [
    code ? `Error de Twilio ${code}:` : "Error de telefonía:",
    message,
    detail,
    trialMessage,
  ]
    .filter(Boolean)
    .join(" ");
}

function getErrorRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

export function TwilioVoiceProvider({ children }: { children: ReactNode }) {
  const deviceRef = useRef<Device | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const initializeDeviceRef = useRef<(() => Promise<void>) | null>(null);
  const callSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deviceSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdMuteRef = useRef(false);
  const [deviceState, setDeviceState] = useState<VoiceDeviceState>("loading");
  const [callState, setCallState] = useState<VoiceCallState>("idle");
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [remoteNumber, setRemoteNumber] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearCallSafetyTimer = useCallback(() => {
    if (callSafetyTimerRef.current) {
      clearTimeout(callSafetyTimerRef.current);
      callSafetyTimerRef.current = null;
    }
  }, []);

  const clearDeviceSafetyTimer = useCallback(() => {
    if (deviceSafetyTimerRef.current) {
      clearTimeout(deviceSafetyTimerRef.current);
      deviceSafetyTimerRef.current = null;
    }
  }, []);

  const clearActiveCall = useCallback((call: Call) => {
    clearCallSafetyTimer();
    if (activeCallRef.current !== call) {
      return;
    }

    activeCallRef.current = null;
    setActiveCall(null);
    setCallState("idle");
    setRemoteNumber("");
    setIsMuted(false);
    setIsHeld(false);
    holdMuteRef.current = false;
  }, [clearCallSafetyTimer]);

  const bindCall = useCallback(
    (call: Call, number: string) => {
      activeCallRef.current = call;
      setActiveCall(call);
      setRemoteNumber(number);
      setIsMuted(call.isMuted());
      setIsHeld(false);
      holdMuteRef.current = false;
      setError(null);
      setCallState(call.direction === "INCOMING" ? "incoming" : "connecting");

      call.on("accept", () => {
        clearCallSafetyTimer();
        setCallState("connected");
      });
      call.on("ringing", () => {
        clearCallSafetyTimer();
        setCallState("ringing");
      });
      call.on("reconnecting", () => setCallState("reconnecting"));
      call.on("reconnected", () => {
        clearCallSafetyTimer();
        setCallState("connected");
      });
      call.on("mute", (muted: boolean) => setIsMuted(muted));
      call.on("disconnect", () => clearActiveCall(call));
      call.on("cancel", () => clearActiveCall(call));
      call.on("reject", () => clearActiveCall(call));
      call.on("error", (callError: Error) => {
        clearCallSafetyTimer();
        setError(getErrorMessage(callError));
        clearActiveCall(call);
      });
    },
    [clearActiveCall, clearCallSafetyTimer],
  );

  useEffect(() => {
    let mounted = true;

    async function initializeDevice() {
      if (!mounted) {
        return;
      }

      setDeviceState("loading");
      clearDeviceSafetyTimer();
      deviceSafetyTimerRef.current = setTimeout(() => {
        if (!mounted) {
          return;
        }
        deviceRef.current?.destroy();
        deviceRef.current = null;
        setDeviceState("error");
        setError(
          "La conexión con Twilio no respondió. Comprueba el token y los permisos del navegador.",
        );
        deviceSafetyTimerRef.current = null;
      }, 20_000);
      try {
        const token = await fetchVoiceToken();
        const { Call: VoiceCall, Device: VoiceDevice } = await import(
          "@twilio/voice-sdk"
        );
        if (!mounted) {
          return;
        }
        deviceRef.current?.destroy();
        deviceRef.current = null;
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
          clearDeviceSafetyTimer();
          setDeviceState("registered");
          setError(null);
        });
        device.on("unregistered", () => {
          clearDeviceSafetyTimer();
          setDeviceState("offline");
          if (activeCallRef.current) {
            clearActiveCall(activeCallRef.current);
          }
        });
        device.on("error", (deviceError: Error) => {
          clearDeviceSafetyTimer();
          setDeviceState("error");
          setError(getErrorMessage(deviceError));
          if (activeCallRef.current) {
            clearActiveCall(activeCallRef.current);
          }
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
          clearDeviceSafetyTimer();
          setDeviceState("error");
          setError(getErrorMessage(deviceError));
        }
      }
    }

    initializeDeviceRef.current = initializeDevice;
    if (typeof window !== "undefined") {
      void initializeDevice();
    }

    return () => {
      mounted = false;
      clearCallSafetyTimer();
      clearDeviceSafetyTimer();
      activeCallRef.current?.disconnect();
      activeCallRef.current = null;
      deviceRef.current?.destroy();
      deviceRef.current = null;
      initializeDeviceRef.current = null;
    };
  }, [
    bindCall,
    clearActiveCall,
    clearCallSafetyTimer,
    clearDeviceSafetyTimer,
  ]);

  const retryDevice = useCallback(async () => {
    if (deviceState === "loading" || callState !== "idle") {
      return;
    }

    setError(null);
    await initializeDeviceRef.current?.();
  }, [callState, deviceState]);

  const startCall = useCallback(
    async (phoneNumber: string) => {
      const destination = normalizeE164PhoneNumber(phoneNumber);
      if (!destination) {
        setError("Ingresa un número telefónico en formato E.164.");
        return;
      }
      const device = deviceRef.current;
      if (!device || deviceState !== "registered") {
        setError("El teléfono todavía no está conectado a Twilio.");
        return;
      }
      if (activeCallRef.current || callState !== "idle") {
        setError("Finaliza la llamada actual antes de iniciar otra.");
        return;
      }

      setError(null);
      setCallState("connecting");
      setRemoteNumber(destination);
      clearCallSafetyTimer();
      callSafetyTimerRef.current = setTimeout(() => {
        const call = activeCallRef.current;
        if (call) {
          call?.disconnect();
        }
        activeCallRef.current = null;
        setActiveCall(null);
        setCallState("idle");
        setRemoteNumber("");
        setError("La llamada no respondió antes del límite de conexión.");
        callSafetyTimerRef.current = null;
      }, 45_000);
      try {
        const call = await device.connect({ params: { To: destination } });
        if (call.status() === "closed") {
          clearCallSafetyTimer();
          setCallState("idle");
          setRemoteNumber("");
          setActiveCall(null);
          setError("La llamada terminó antes de establecerse.");
          return;
        }
        bindCall(call, destination);
      } catch (callError) {
        clearCallSafetyTimer();
        setCallState("idle");
        setRemoteNumber("");
        setActiveCall(null);
        setError(getErrorMessage(callError));
      }
    },
    [bindCall, callState, clearCallSafetyTimer, deviceState],
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

  const toggleHold = useCallback(() => {
    const call = activeCallRef.current;
    if (!call || callState === "incoming") {
      return;
    }

    if (isHeld) {
      call.mute(holdMuteRef.current);
      setIsMuted(holdMuteRef.current);
      setIsHeld(false);
      holdMuteRef.current = false;
      return;
    }

    holdMuteRef.current = call.isMuted();
    call.mute(true);
    setIsMuted(true);
    setIsHeld(true);
  }, [callState, isHeld]);

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
      isHeld,
      error,
      startCall,
      answerCall,
      rejectCall,
      hangUp,
      toggleMute,
      toggleHold,
      sendDigits,
      clearError,
      retryDevice,
    }),
    [
      deviceState,
      callState,
      activeCall,
      remoteNumber,
      isMuted,
      isHeld,
      error,
      startCall,
      answerCall,
      rejectCall,
      hangUp,
      toggleMute,
      toggleHold,
      sendDigits,
      clearError,
      retryDevice,
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
