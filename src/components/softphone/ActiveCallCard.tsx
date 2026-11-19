"use client";

import { useTwilioVoice } from "@/context/TwilioVoiceContext";

const CALL_LABELS = {
  incoming: "Llamada entrante",
  connecting: "Conectando",
  ringing: "Llamando",
  connected: "En llamada",
  reconnecting: "Reconectando",
} as const;

export function ActiveCallCard() {
  const {
    activeCall,
    answerCall,
    callState,
    deviceState,
    error,
    hangUp,
    isMuted,
    rejectCall,
    remoteNumber,
    retryDevice,
    toggleMute,
  } = useTwilioVoice();

  if (callState === "idle" && !error) {
    return (
      <section className="rounded-2xl border border-slate-800/80 bg-[#101116]/80 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Voz en tiempo real
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-200">
              Sin llamadas activas
            </h2>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-400">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                deviceState === "registered"
                  ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                  : "bg-amber-400"
              }`}
            />
            {deviceState === "registered" ? "Dispositivo listo" : "Conectando…"}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-live="polite"
      className={`overflow-hidden rounded-2xl border bg-[#101116]/90 shadow-[0_24px_70px_-38px_rgba(52,211,153,0.3)] backdrop-blur-xl ${
        callState === "incoming"
          ? "border-emerald-400/40"
          : "border-slate-800/80"
      }`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {callState === "idle" ? "Estado del teléfono" : "Llamada activa"}
          </p>
          {callState !== "idle" && (
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {CALL_LABELS[callState]}
            </span>
          )}
        </div>
        {callState !== "idle" && (
          <div className="mt-5 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] font-mono text-lg text-cyan-200">
              {remoteNumber.slice(-2) || "••"}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-mono text-xl font-semibold tracking-wide text-slate-100">
                {remoteNumber || "Preparando llamada"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {activeCall?.direction === "INCOMING"
                  ? "Llamada entrante"
                  : "Llamada saliente"}
              </p>
            </div>
          </div>
        )}
        {error && (
          <p
            className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2 text-sm text-rose-200"
            role="alert"
          >
            {error}
          </p>
        )}
        {callState === "idle" && deviceState === "error" && (
          <button
            className="mt-4 rounded-lg border border-cyan-300/25 bg-cyan-300/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14]"
            onClick={() => void retryDevice()}
            type="button"
          >
            Reintentar conexión de voz
          </button>
        )}

        {callState === "incoming" ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-emerald-950 transition hover:bg-emerald-300"
              onClick={answerCall}
              type="button"
            >
              Responder
            </button>
            <button
              className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/20"
              onClick={rejectCall}
              type="button"
            >
              Rechazar
            </button>
          </div>
        ) : callState !== "idle" ? (
          <div className="mt-5 flex items-center gap-3">
            <button
              aria-pressed={isMuted}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                isMuted
                  ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                  : "border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-600"
              }`}
              onClick={toggleMute}
              type="button"
            >
              {isMuted ? "Activar micrófono" : "Silenciar"}
            </button>
            <button
              aria-label="Finalizar llamada"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-[0_8px_24px_-12px_rgba(244,63,94,0.9)] transition hover:bg-rose-400"
              onClick={hangUp}
              type="button"
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="20"
                viewBox="0 0 24 24"
                width="20"
              >
                <path
                  d="M4.6 14.1C8.9 11.2 15.1 11.2 19.4 14.1L21 15.2L18.9 19L15.5 17.8L15 15.8C13.1 15.2 10.9 15.2 9 15.8L8.5 17.8L5.1 19L3 15.2L4.6 14.1Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
