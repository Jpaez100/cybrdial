"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Contact = {
  id: string;
  name: string;
  phone: string;
};

type Message = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  body: string;
  createdAt: string;
};

export default function MessagesPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const loadContacts = useCallback(async () => {
    const response = await fetch("/api/contacts", { cache: "no-store" });
    const result = (await response.json()) as {
      contacts?: Contact[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(result.error ?? "No se pudieron cargar los contactos.");
    }

    setContacts(result.contacts ?? []);
    setSelectedContactId((current) => {
      if (current && result.contacts?.some((contact) => contact.id === current)) {
        return current;
      }
      return (
        new URLSearchParams(window.location.search).get("contactId") ??
        result.contacts?.[0]?.id ??
        ""
      );
    });
  }, []);

  const loadMessages = useCallback(async (contactId: string) => {
    if (!contactId) {
      setMessages([]);
      return;
    }

    const response = await fetch(
      `/api/messages?contactId=${encodeURIComponent(contactId)}`,
      { cache: "no-store" },
    );
    const result = (await response.json()) as {
      messages?: Message[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(result.error ?? "No se pudieron cargar los mensajes.");
    }
    setMessages(result.messages ?? []);
  }, []);

  useEffect(() => {
    loadContacts().catch((cause: unknown) =>
      setError(
        cause instanceof Error ? cause.message : "Error al cargar contactos.",
      ),
    );
  }, [loadContacts]);

  useEffect(() => {
    if (!selectedContactId) {
      setMessages([]);
      return;
    }

    let active = true;
    const refresh = () =>
      loadMessages(selectedContactId).catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Error al actualizar la conversación.",
          );
        }
      });

    setError("");
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 4000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [loadMessages, selectedContactId]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContactId || !text.trim()) {
      return;
    }

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContactId,
          body: text.trim(),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo enviar el mensaje.");
      }
      setText("");
      await loadMessages(selectedContactId);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Error al enviar el mensaje.",
      );
    } finally {
      setSending(false);
    }
  }

  const selectedContact = contacts.find(
    (contact) => contact.id === selectedContactId,
  );

  return (
    <section className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
          Bandeja de entrada
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
          Mensajes
        </h1>
        <p className="mt-2 text-slate-400">
          Conversaciones SMS actualizadas automáticamente cada cuatro segundos.
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {error}
          {error.includes("autenticado") && (
            <>
              {" "}
              <Link className="font-semibold underline" href="/login">
                Inicia sesión
              </Link>
            </>
          )}
        </div>
      )}

      <div className="grid min-h-[560px] overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/50 shadow-sm backdrop-blur-md lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-slate-800/80 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-800/80 px-5 py-4">
            <h2 className="font-semibold text-slate-100">Conversaciones</h2>
          </div>
          {contacts.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">
              <p>Aún no hay contactos para iniciar una conversación.</p>
              <Link className="mt-3 inline-block font-semibold text-cyan-300 hover:text-cyan-200" href="/contacts">
                Agregar contacto
              </Link>
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto lg:max-h-[480px]">
              {contacts.map((contact) => (
                <li key={contact.id}>
                  <button
                    aria-current={
                      selectedContactId === contact.id ? "true" : undefined
                    }
                    className={`w-full border-b border-slate-800/80 px-5 py-4 text-left transition hover:bg-slate-800/70 ${
                      selectedContactId === contact.id
                        ? "bg-cyan-400/[0.08] ring-1 ring-inset ring-cyan-400/20"
                        : ""
                    }`}
                    onClick={() => setSelectedContactId(contact.id)}
                    type="button"
                  >
                    <span className="block font-semibold text-slate-100">
                      {contact.name}
                    </span>
                    <span className="mt-1 block text-sm text-slate-400">
                      {contact.phone}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="flex min-h-[480px] flex-col">
          {selectedContact ? (
            <>
              <header className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-100">
                    {selectedContact.name}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {selectedContact.phone}
                  </p>
                </div>
                <a
                  className="rounded-lg border border-cyan-400/20 bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                  href={`tel:${selectedContact.phone}`}
                >
                  Llamar
                </a>
              </header>
              <div
                aria-live="polite"
                className="flex-1 space-y-3 overflow-y-auto bg-[#09090B]/70 p-5"
              >
                {messages.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-400">
                    No hay mensajes en esta conversación. Envía el primero.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      className={`flex ${
                        message.direction === "OUTBOUND"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                      key={message.id}
                    >
                      <article
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                          message.direction === "OUTBOUND"
                            ? "rounded-br-md border border-emerald-400/20 bg-emerald-600 text-white"
                            : "rounded-bl-md border border-slate-700/80 bg-slate-800/80 text-slate-100"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {message.body}
                        </p>
                        <p
                          className={`mt-2 text-xs ${
                            message.direction === "OUTBOUND"
                              ? "text-emerald-100"
                              : "text-slate-400"
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleString()} ·{" "}
                          {message.status}
                        </p>
                      </article>
                    </div>
                  ))
                )}
              </div>
              <form
                className="flex gap-3 border-t border-slate-800/80 p-4"
                onSubmit={(event) => void sendMessage(event)}
              >
                <textarea
                  aria-label="Escribe un mensaje"
                  className="min-h-12 flex-1 resize-y rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  maxLength={1600}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Escribe un mensaje…"
                  required
                  rows={1}
                  value={text}
                />
                <button
                  className="self-end rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={sending || !text.trim()}
                  type="submit"
                >
                  {sending ? "Enviando…" : "Enviar"}
                </button>
              </form>
            </>
          ) : (
            <div className="m-auto p-8 text-center">
              <h2 className="font-semibold text-slate-100">
                Selecciona una conversación
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Elige un contacto de la lista para ver sus mensajes.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
