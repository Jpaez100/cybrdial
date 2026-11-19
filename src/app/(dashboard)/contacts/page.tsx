"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ActiveCallCard } from "@/components/softphone/ActiveCallCard";
import { useTwilioVoice } from "@/context/TwilioVoiceContext";

type Contact = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
};

type ContactForm = {
  name: string;
  phone: string;
  email: string;
  notes: string;
};

const EMPTY_FORM: ContactForm = { name: "", phone: "", email: "", notes: "" };

export default function ContactsPage() {
  const { callState, clearError, error: voiceError, startCall } = useTwilioVoice();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
  }, []);

  useEffect(() => {
    loadContacts()
      .catch((cause: unknown) =>
        setError(
          cause instanceof Error ? cause.message : "Error al cargar contactos.",
        ),
      )
      .finally(() => setLoading(false));
  }, [loadContacts]);

  function startEditing(contact: Contact) {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email ?? "",
      notes: contact.notes ?? "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await fetch(
        editingId ? `/api/contacts/${editingId}` : "/api/contacts",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            email: form.email || null,
            notes: form.notes || null,
          }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo guardar el contacto.");
      }
      resetForm();
      await loadContacts();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Error al guardar contacto.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteContact(contact: Contact) {
    if (!window.confirm(`¿Eliminar a ${contact.name}?`)) {
      return;
    }
    setError("");
    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo eliminar el contacto.");
      }
      if (editingId === contact.id) {
        resetForm();
      }
      await loadContacts();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Error al eliminar contacto.",
      );
    }
  }

  return (
    <section className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
          Directorio
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-100">
          Contactos
        </h1>
        <p className="mt-2 text-slate-400">
          Administra tus contactos y comunícate con un solo clic.
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

      {(callState !== "idle" || voiceError) && (
        <div className="max-w-xl">
          <ActiveCallCard />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/50 shadow-sm backdrop-blur-md">
          <div className="border-b border-slate-800/80 px-5 py-4">
            <h2 className="font-semibold text-slate-100">Tu directorio</h2>
          </div>
          {loading ? (
            <p className="p-6 text-sm text-slate-400">Cargando contactos…</p>
          ) : contacts.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">
              Aún no tienes contactos. Agrega el primero con el formulario.
            </p>
          ) : (
            <ul className="divide-y divide-slate-800/80">
              {contacts.map((contact) => (
                <li
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                  key={contact.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-100">
                      {contact.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">{contact.phone}</p>
                    {contact.email && (
                      <p className="text-sm text-slate-400">{contact.email}</p>
                    )}
                    {contact.notes && (
                      <p className="mt-2 text-sm text-slate-400">{contact.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      aria-label={`Llamar a ${contact.name}`}
                      className="rounded-lg border border-cyan-400/20 bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                      onClick={() => {
                        clearError();
                        void startCall(contact.phone);
                      }}
                      type="button"
                    >
                      Llamar
                    </button>
                    <Link
                      aria-label={`Enviar mensaje a ${contact.name}`}
                      className="rounded-lg border border-emerald-400/20 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                      href={`/messages?contactId=${encodeURIComponent(contact.id)}`}
                    >
                      Mensaje
                    </Link>
                    <button
                      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                      onClick={() => startEditing(contact)}
                      type="button"
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-lg px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-400/10 hover:text-rose-200"
                      onClick={() => void deleteContact(contact)}
                      type="button"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          className="h-fit space-y-4 rounded-xl border border-slate-800/80 bg-slate-900/50 p-5 shadow-sm backdrop-blur-md"
          onSubmit={(event) => void saveContact(event)}
        >
          <div>
            <h2 className="font-semibold text-slate-100">
              {editingId ? "Editar contacto" : "Agregar contacto"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              El teléfono debe usar formato internacional E.164.
            </p>
          </div>
          <label className="block text-sm font-medium text-slate-300">
            Nombre
            <input
              autoComplete="name"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              maxLength={100}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              required
              value={form.name}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Teléfono
            <input
              autoComplete="tel"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              placeholder="+14155552671"
              required
              value={form.phone}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Correo (opcional)
            <input
              autoComplete="email"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              type="email"
              value={form.email}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Notas (opcional)
            <textarea
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              maxLength={2000}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              rows={3}
              value={form.notes}
            />
          </label>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear contacto"}
            </button>
            {editingId && (
              <button
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                onClick={resetForm}
                type="button"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
