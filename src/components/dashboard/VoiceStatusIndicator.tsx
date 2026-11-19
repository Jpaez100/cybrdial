"use client";

import { useTwilioVoice } from "@/context/TwilioVoiceContext";

export function VoiceStatusIndicator() {
  const { deviceState } = useTwilioVoice();
  const isReady = deviceState === "registered";

  return (
    <div
      aria-label={`Teléfono ${isReady ? "conectado" : deviceState}`}
      className="flex items-center gap-2 rounded-full border border-slate-800/90 bg-slate-950/70 px-3 py-2"
    >
      <span
        className={`relative flex h-2 w-2 ${
          isReady ? "text-emerald-400" : "text-amber-400"
        }`}
      >
        {isReady && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-30" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
      </span>
      <span className="text-xs font-medium text-slate-300">
        {isReady ? "Voz conectada" : "Voz desconectada"}
      </span>
    </div>
  );
}
