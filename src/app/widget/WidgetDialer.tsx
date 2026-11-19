"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useTwilioVoice } from "@/context/TwilioVoiceContext";
import { normalizeE164PhoneNumber } from "@/lib/phone";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

type ActiveTab = "dialer" | "history" | "messages" | "contacts";
type CallRecord = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  fromNumber: string;
  toNumber: string;
  durationSec: number | null;
  createdAt: string;
  contact: { id: string; name: string; phone: string } | null;
};
type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
};
type Message = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  body: string;
  createdAt: string;
  contact: { id: string; name: string; phone: string } | null;
};

export function WidgetDialer() {
  const [number, setNumber] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dialer");
  const [loading, setLoading] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [dataError, setDataError] = useState("");
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactFilter, setContactFilter] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const hostOriginRef = useRef("");

  const {
    answerCall,
    callState,
    clearError,
    deviceState,
    error,
    hangUp,
    isHeld,
    isMuted,
    rejectCall,
    remoteNumber,
    sendDigits,
    startCall,
    toggleHold,
    toggleMute,
  } = useTwilioVoice();
  const inCall = callState !== "idle";

  const postToHost = useCallback(
    (type: string, payload: Record<string, unknown> = {}) => {
    if (hostOriginRef.current) {
      window.parent.postMessage({ type, ...payload }, hostOriginRef.current);
    }
    },
    [],
  );

  const readApi = useCallback(async function readApi<T>(
    url: string,
    init?: RequestInit,
  ): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
    try {
      const response = await fetch(url, { cache: "no-store", ...init });
      const data = (await response.json()) as T & { error?: string };
      if (response.status === 401 || response.status === 403) {
        setSessionError(
          response.status === 401
            ? "Tu sesión expiró. Inicia sesión nuevamente."
            : "Tu sesión no tiene permiso para acceder a este recurso.",
        );
        postToHost("cybrdial:auth-state", { authenticated: false });
        return {
          ok: false,
          status: response.status,
          error: data.error ?? "Sesión no válida.",
        };
      }
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: data.error ?? "No se pudo completar la solicitud.",
        };
      }
      return { ok: true, data };
    } catch {
      return {
        ok: false,
        status: 0,
        error: "No se pudo conectar con CybrDial.",
      };
    }
  }, [postToHost]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setDataError("");
    const result = await readApi<{ calls: CallRecord[] }>("/api/calls?limit=30");
    if (result.ok) {
      setCalls(result.data.calls);
    } else {
      setDataError(result.error);
    }
    setLoading(false);
  }, [readApi]);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setDataError("");
    const result = await readApi<{ contacts: Contact[] }>("/api/contacts");
    if (result.ok) {
      setContacts(result.data.contacts);
      setSelectedContactId((current) =>
        current &&
        result.data.contacts.some((contact) => contact.id === current)
          ? current
          : result.data.contacts[0]?.id ?? "",
      );
    } else {
      setDataError(result.error);
    }
    setLoading(false);
  }, [readApi]);

  const loadMessages = useCallback(async (contactId = "") => {
    if (!contactId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setDataError("");
    const result = await readApi<{ messages: Message[] }>(
      `/api/messages?contactId=${encodeURIComponent(contactId)}&limit=100`,
    );
    if (result.ok) {
      setMessages(result.data.messages);
    } else {
      setDataError(result.error);
    }
    setLoading(false);
  }, [readApi]);

  useEffect(() => {
    if (activeTab === "history") {
      void loadHistory();
    } else if (activeTab === "contacts") {
      void loadContacts();
    } else if (activeTab === "messages") {
      if (contacts.length === 0) {
        void loadContacts();
      } else if (selectedContactId) {
        void loadMessages(selectedContactId);
      }
    }
  }, [activeTab, contacts.length, loadContacts, loadHistory, loadMessages, selectedContactId]);

  useEffect(() => {
    if (activeTab === "messages" && selectedContactId) {
      void loadMessages(selectedContactId);
    }
  }, [activeTab, loadMessages, selectedContactId]);

  useEffect(() => {
    if (!hostOriginRef.current) {
      return;
    }
    postToHost("cybrdial:call-state", {
      deviceState,
      callState,
      remoteNumber,
      isMuted,
      isHeld,
    });
  }, [callState, deviceState, isHeld, isMuted, postToHost, remoteNumber]);

  useEffect(() => {
    if (!error) {
      return;
    }
    postToHost("cybrdial:error", { message: error });
  }, [error, postToHost]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) {
        return;
      }
      if (
        event.data?.type === "cybrdial:init" &&
        typeof event.data.hostOrigin === "string"
      ) {
        hostOriginRef.current = event.data.hostOrigin;
        postToHost("cybrdial:auth-state", { authenticated: true });
        postToHost("cybrdial:ready");
        return;
      }
      if (hostOriginRef.current && event.origin !== hostOriginRef.current) {
        return;
      }
      if (event.data?.type === "cybrdial:dial") {
        const normalized = normalizeE164PhoneNumber(
          typeof event.data.number === "string" ? event.data.number : "",
        );
        if (normalized) {
          setNumber(normalized);
          setActiveTab("dialer");
          clearError();
          void startCall(normalized);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [clearError, postToHost, startCall]);

  function filterNumber(value: string) {
    const compact = value.replace(/[^0-9+*#]/g, "");
    if (compact.includes("+")) {
      return `+${compact.replace(/\+/g, "").slice(0, 15)}`;
    }
    return compact.slice(0, 16);
  }

  useEffect(() => {
    function handlePhysicalKey(event: KeyboardEvent) {
      if (activeTab !== "dialer") {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.id !== "widget-number"
      ) {
        return;
      }
      if (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (inCall) {
        if (/^[0-9*#]$/.test(event.key)) {
          event.preventDefault();
          sendDigits(event.key);
        }
        return;
      }

      if (/^[0-9*#]$/.test(event.key)) {
        event.preventDefault();
        setNumber((current) => filterNumber(`${current}${event.key}`));
      } else if (event.key === "+" || event.code === "NumpadAdd") {
        event.preventDefault();
        setNumber((current) => (current === "" ? "+" : current));
      } else if (event.key === "Backspace") {
        event.preventDefault();
        setNumber((current) => current.slice(0, -1));
      }
    }

    window.addEventListener("keydown", handlePhysicalKey);
    return () => window.removeEventListener("keydown", handlePhysicalKey);
  }, [activeTab, inCall, sendDigits]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    void startCall(number);
  }

  function callNumber(phoneNumber: string) {
    const normalized = normalizeE164PhoneNumber(phoneNumber);
    if (!normalized) {
      setDataError("El número debe estar en formato E.164.");
      return;
    }
    setNumber(normalized);
    setActiveTab("dialer");
    clearError();
    void startCall(normalized);
  }

  function openMessages(contact: Contact) {
    setSelectedContactId(contact.id);
    setActiveTab("messages");
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContactId || !messageText.trim()) {
      return;
    }
    setLoading(true);
    setDataError("");
    const result = await readApi<{ message: Message }>(
      "/api/messages/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContactId,
          body: messageText.trim(),
        }),
      },
    );
    if (result.ok) {
      setMessageText("");
      await loadMessages(selectedContactId);
    } else {
      setDataError(
        result.status === 422
          ? `${result.error} (Twilio 572006)`
          : result.error,
      );
    }
    setLoading(false);
  }

  function closeWidget() {
    postToHost("cybrdial:close");
  }

  function formatDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  }

  function callStatus(call: CallRecord) {
    if (
      ["no-answer", "busy", "failed", "canceled"].includes(call.status) ||
      call.status === "ringing"
    ) {
      return "Missed";
    }
    return call.direction === "INBOUND" ? "Incoming" : "Outgoing";
  }

  const selectedContact = contacts.find(
    (contact) => contact.id === selectedContactId,
  );
  const filteredContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.phone}`
      .toLowerCase()
      .includes(contactFilter.toLowerCase()),
  );

  return (
    <section className="h-[620px] max-h-[calc(100vh-40px)] overflow-hidden rounded-2xl border border-slate-800/90 bg-[#09090B] text-slate-100 shadow-2xl">
      <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/[0.08] text-sm font-black text-cyan-300">C</span>
          <div>
            <p className="text-sm font-bold tracking-wide text-slate-100">CybrDial</p>
            <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  deviceState === "registered"
                    ? "bg-emerald-400"
                    : deviceState === "error"
                      ? "bg-rose-400"
                      : "bg-amber-400"
                }`}
              />
              {deviceState === "registered"
                ? "Connected"
                : deviceState === "error"
                  ? "Voice unavailable"
                  : deviceState === "offline"
                    ? "Offline"
                    : "Connecting"}
            </p>
          </div>
        </div>
        <button aria-label="Minimize widget" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-lg text-slate-400 hover:border-slate-700 hover:text-white" onClick={closeWidget} type="button">−</button>
      </header>

      <nav aria-label="Widget navigation" className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/40">
        {(["dialer", "history", "messages", "contacts"] as const).map((tab) => (
          <button className={`px-1 py-2.5 text-[11px] font-semibold transition ${activeTab === tab ? "border-b-2 border-cyan-300 text-cyan-200" : "text-slate-500 hover:text-slate-300"}`} key={tab} onClick={() => setActiveTab(tab)} type="button">
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {sessionError ? (
        <div className="flex h-[calc(100%-98px)] items-center justify-center p-5 text-center">
          <div>
            <p className="text-sm font-semibold text-slate-100">{sessionError}</p>
            <a className="mt-4 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white" href="/login" target="_top">Iniciar sesión</a>
          </div>
        </div>
      ) : activeTab === "dialer" ? (
        <div className="h-[calc(100%-98px)] overflow-y-auto p-3">
          {inCall ? (
            <div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Active call</p>
                <p className="mt-2 truncate font-mono text-xl font-semibold text-slate-100">{remoteNumber || "Preparing call"}</p>
                <p className="mt-1 text-xs text-emerald-300">{callState}</p>
              </div>
              {callState === "incoming" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="rounded-xl bg-emerald-400 py-3 text-sm font-bold text-emerald-950" onClick={answerCall} type="button">Answer</button>
                  <button className="rounded-xl border border-rose-400/30 bg-rose-400/10 py-3 text-sm font-semibold text-rose-200" onClick={rejectCall} type="button">Decline</button>
                </div>
              ) : (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button aria-pressed={isMuted} className={`rounded-xl border py-3 text-xs font-semibold ${isMuted ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-slate-800 bg-slate-900/70 text-slate-300"}`} onClick={toggleMute} type="button">{isMuted ? "Unmute" : "Mute"}</button>
                    <button aria-pressed={isHeld} className={`rounded-xl border py-3 text-xs font-semibold ${isHeld ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100" : "border-slate-800 bg-slate-900/70 text-slate-300"}`} onClick={toggleHold} type="button">{isHeld ? "Resume" : "Hold"}</button>
                    <button aria-pressed={showKeypad} className="rounded-xl border border-slate-800 bg-slate-900/70 py-3 text-xs font-semibold text-slate-300" onClick={() => setShowKeypad((current) => !current)} type="button">Keypad</button>
                  </div>
                  {showKeypad && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {KEYS.map((key) => <button className="h-11 rounded-xl border border-slate-800 bg-slate-900/70 text-lg font-semibold text-slate-100" key={key} onClick={() => sendDigits(key)} type="button">{key}</button>)}
                    </div>
                  )}
                  <button className="mt-3 w-full rounded-xl bg-rose-500 py-3 text-sm font-bold text-white" onClick={hangUp} type="button">End call</button>
                </>
              )}
            </div>
          ) : (
            <form onSubmit={submit}>
              {error && <p className="mb-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2 text-xs text-rose-200" role="alert">{error}</p>}
              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-3">
                <button
                  aria-label="Agregar prefijo internacional"
                  className="h-10 px-2 font-mono text-lg font-bold text-cyan-300 disabled:opacity-40"
                  disabled={number.length > 0}
                  onClick={() =>
                    setNumber((current) =>
                      current === "" ? "+" : current,
                    )
                  }
                  type="button"
                >
                  +
                </button>
                <input
                  id="widget-number"
                  aria-label="Destination number"
                  className="h-12 min-w-0 flex-1 bg-transparent text-center font-mono text-lg text-slate-100 outline-none"
                  inputMode="tel"
                  maxLength={16}
                  onChange={(event) =>
                    setNumber(filterNumber(event.target.value))
                  }
                  placeholder="+1 415 555 2671"
                  value={number}
                />
                <button
                  aria-label="Borrar último dígito"
                  className="h-10 px-2 text-slate-400 hover:text-white disabled:opacity-30"
                  disabled={number.length === 0}
                  onClick={() =>
                    setNumber((current) => current.slice(0, -1))
                  }
                  type="button"
                >
                  ⌫
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {KEYS.map((key) => <button className="h-12 rounded-xl border border-slate-800 bg-slate-900/70 text-lg font-semibold text-slate-100" key={key} onClick={() => setNumber((current) => filterNumber(`${current}${key}`))} type="button">{key}</button>)}
              </div>
              <button className="mt-3 w-full rounded-xl bg-emerald-400 py-3 text-sm font-bold text-emerald-950 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500" disabled={deviceState !== "registered" || !normalizeE164PhoneNumber(number)} type="submit">Call</button>
            </form>
          )}
        </div>
      ) : (
        <div className="h-[calc(100%-98px)] overflow-y-auto p-3">
          {dataError && <p className="mb-3 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2 text-xs text-rose-200" role="alert">{dataError}</p>}
          {loading && <p className="py-8 text-center text-xs text-slate-500">Loading…</p>}
          {!loading && activeTab === "history" && (
            calls.length === 0 ? <p className="py-10 text-center text-xs text-slate-500">No recent calls.</p> :
            <div className="space-y-2">
              {calls.map((call) => {
                const phone = call.direction === "INBOUND" ? call.fromNumber : call.toNumber;
                return (
                  <button className="w-full rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-3 text-left" key={call.id} onClick={() => callNumber(phone)} type="button">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-100">{call.contact?.name ?? phone}</span>
                      <span className={`text-[10px] ${callStatus(call) === "Missed" ? "text-rose-300" : "text-cyan-300"}`}>{callStatus(call)}</span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-400">{phone}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{formatDate(call.createdAt)} · {call.durationSec ? `${call.durationSec}s` : "0s"}</p>
                  </button>
                );
              })}
            </div>
          )}
          {!loading && activeTab === "contacts" && (
            <>
              <input aria-label="Filter contacts" className="mb-3 h-10 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none" onChange={(event) => setContactFilter(event.target.value)} placeholder="Search contacts…" value={contactFilter} />
              {filteredContacts.length === 0 ? <p className="py-10 text-center text-xs text-slate-500">No contacts found.</p> :
              <div className="space-y-2">
                {filteredContacts.map((contact) => (
                  <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-3" key={contact.id}>
                    <p className="truncate text-sm font-semibold text-slate-100">{contact.name}</p>
                    <p className="mt-1 font-mono text-xs text-slate-400">{contact.phone}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button className="rounded-lg bg-cyan-600 py-2 text-xs font-semibold text-white" onClick={() => callNumber(contact.phone)} type="button">Call</button>
                      <button className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 py-2 text-xs font-semibold text-emerald-200" onClick={() => openMessages(contact)} type="button">Message</button>
                    </div>
                  </article>
                ))}
              </div>}
            </>
          )}
          {!loading && activeTab === "messages" && (
            <>
              {contacts.length === 0 ? <p className="py-10 text-center text-xs text-slate-500">No contacts available.</p> : (
                <>
                  <select aria-label="Conversation" className="mb-3 h-10 w-full rounded-xl border border-slate-800 bg-slate-950 px-2 text-xs text-slate-100" value={selectedContactId} onChange={(event) => setSelectedContactId(event.target.value)}>
                    {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                  </select>
                  <div className="h-[390px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/40 p-2">
                    {messages.length === 0 ? <p className="py-8 text-center text-xs text-slate-500">No messages yet.</p> : messages.map((message) => (
                      <div className={`mb-2 flex ${message.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`} key={message.id}>
                        <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${message.direction === "OUTBOUND" ? "bg-cyan-600 text-white" : "border border-slate-800 bg-slate-900 text-slate-200"}`}>
                          <p>{message.body}</p>
                          <p className="mt-1 text-[9px] opacity-70">{message.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form className="mt-2 flex gap-2" onSubmit={sendMessage}>
                    <input aria-label="Message" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs text-slate-100" maxLength={1600} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a message…" value={messageText} />
                    <button className="rounded-xl bg-emerald-500 px-3 text-xs font-bold text-emerald-950 disabled:opacity-50" disabled={!selectedContact || !messageText.trim() || loading} type="submit">Send</button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
