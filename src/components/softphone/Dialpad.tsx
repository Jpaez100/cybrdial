"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTwilioVoice } from "@/context/TwilioVoiceContext";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const KEY_HINTS: Record<string, string> = {
  "1": "",
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
  "*": "",
  "0": "+",
  "#": "",
};

export function Dialpad() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const { callState, deviceState, startCall, sendDigits } = useTwilioVoice();
  const isOnCall = callState !== "idle";

  function pressKey(key: string) {
    if (isOnCall) {
      sendDigits(key);
      return;
    }

    setPhoneNumber((current) => `${current}${key}`);
  }

  function insertPlus() {
    if (isOnCall) {
      return;
    }
    setPhoneNumber((current) => (current === "" ? "+" : current));
  }

  function filterPhoneNumber(value: string) {
    const dialCharacters = value.replace(/[^0-9+*#]/g, "");
    if (dialCharacters.includes("+")) {
      return `+${dialCharacters.replace(/\+/g, "").slice(0, 15)}`;
    }
    return dialCharacters.slice(0, 16);
  }

  function submitCall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void startCall(phoneNumber);
  }

  useEffect(() => {
    function handlePhysicalKey(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        if (
          !(target instanceof HTMLInputElement) ||
          target.id !== "phone-number"
        ) {
          return;
        }
      }

      if (isOnCall) {
        if (/^[0-9*#]$/.test(event.key)) {
          event.preventDefault();
          sendDigits(event.key);
        }
        return;
      }

      if (/^[0-9*#]$/.test(event.key)) {
        event.preventDefault();
        setPhoneNumber((current) =>
          filterPhoneNumber(`${current}${event.key}`),
        );
      } else if (event.key === "+" || event.code === "NumpadAdd") {
        event.preventDefault();
        setPhoneNumber((current) => (current === "" ? "+" : current));
      } else if (event.key === "Backspace") {
        event.preventDefault();
        setPhoneNumber((current) => current.slice(0, -1));
      }
    }

    window.addEventListener("keydown", handlePhysicalKey);
    return () => window.removeEventListener("keydown", handlePhysicalKey);
  }, [isOnCall, sendDigits]);

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-[#101116]/90 p-5 shadow-[0_24px_70px_-38px_rgba(34,211,238,0.28)] backdrop-blur-xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Softphone
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-100">Dialpad</h2>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {isOnCall ? "DTMF" : "E.164"}
        </span>
      </div>

      <form className="mt-5" onSubmit={submitCall}>
        <label className="sr-only" htmlFor="phone-number">
          Número telefónico
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#09090B] px-3">
          <button
            aria-label="Agregar prefijo internacional"
            className="px-1 text-lg text-cyan-400 transition hover:text-cyan-200 disabled:opacity-30"
            disabled={isOnCall || phoneNumber.length > 0}
            onClick={insertPlus}
            type="button"
          >
            +
          </button>
          <input
            autoComplete="tel"
            className="min-w-0 flex-1 bg-transparent py-3.5 text-center font-mono text-lg tracking-[0.12em] text-slate-100 outline-none placeholder:text-slate-700"
            disabled={isOnCall}
            id="phone-number"
            inputMode="tel"
            maxLength={16}
            onChange={(event) =>
              setPhoneNumber(filterPhoneNumber(event.target.value))
            }
            placeholder="+1 415 555 2671"
            type="tel"
            value={phoneNumber}
          />
          <button
            aria-label="Borrar último dígito"
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
            disabled={isOnCall || phoneNumber.length === 0}
            onClick={() =>
              setPhoneNumber((current) => current.slice(0, -1))
            }
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="18"
              viewBox="0 0 24 24"
              width="18"
            >
              <path
                d="M9 5H20V19H9L3 12L9 5Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
              <path
                d="M12 9L17 15M17 9L12 15"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.7"
              />
            </svg>
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {KEYS.map((key) => (
            <button
              aria-label={`Tono ${key}`}
              className="group flex h-[58px] flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/55 transition hover:border-cyan-400/50 hover:bg-cyan-400/[0.08] active:scale-[0.97]"
              key={key}
              onClick={() => pressKey(key)}
              type="button"
            >
              <span className="font-mono text-xl font-medium leading-none text-slate-100 transition group-hover:text-cyan-200">
                {key}
              </span>
              <span className="mt-1 h-2 text-xs font-semibold tracking-[0.2em] text-slate-400">
                {KEY_HINTS[key]}
              </span>
            </button>
          ))}
        </div>
        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-emerald-950 shadow-[0_10px_30px_-14px_rgba(52,211,153,0.75)] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
          disabled={isOnCall || deviceState !== "registered" || !phoneNumber}
          type="submit"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="17"
            viewBox="0 0 24 24"
            width="17"
          >
            <path
              d="M7.1 3.8L10 3L12 8L9.8 9.7C10.8 11.8 12.2 13.2 14.3 14.2L16 12L21 14L20.2 16.9C19.9 18 18.9 18.7 17.8 18.6C10.9 18.1 5.9 13.1 5.4 6.2C5.3 5.1 6 4.1 7.1 3.8Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          {isOnCall ? "En llamada" : "Iniciar llamada"}
        </button>
      </form>
      <p className="mt-3 text-center text-xs text-slate-400">
        Las llamadas requieren permiso de micrófono en el navegador.
      </p>
    </section>
  );
}
