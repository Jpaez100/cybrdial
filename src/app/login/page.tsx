"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        registering ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, ...(registering ? { name } : {}) }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo completar la solicitud.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Error de autenticación.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/50 p-7 shadow-[0_24px_70px_-38px_rgba(34,211,238,0.28)] backdrop-blur-md">
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/">
          ← CybrDial
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-slate-100">
          {registering ? "Crear cuenta" : "Iniciar sesión"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Accede a tu centro de comunicaciones.
        </p>
        {error && (
          <p
            className="mt-5 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2 text-sm text-rose-200"
            role="alert"
          >
            {error}
          </p>
        )}
        <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
          {registering && (
            <label className="block text-sm font-medium text-slate-300">
              Nombre (opcional)
              <input
                autoComplete="name"
                className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </label>
          )}
          <label className="block text-sm font-medium text-slate-300">
            Correo
            <input
              autoComplete="email"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Contraseña
            <input
              autoComplete={registering ? "new-password" : "current-password"}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              minLength={registering ? 12 : undefined}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            {registering && (
              <span className="mt-1 block text-xs text-slate-400">
                Usa al menos 12 caracteres.
              </span>
            )}
          </label>
          <button
            className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting
              ? "Procesando…"
              : registering
                ? "Crear cuenta"
                : "Iniciar sesión"}
          </button>
        </form>
        <button
          className="mt-5 w-full text-center text-sm font-medium text-cyan-300 hover:text-cyan-200 hover:underline"
          onClick={() => {
            setRegistering(!registering);
            setError("");
          }}
          type="button"
        >
          {registering
            ? "¿Ya tienes una cuenta? Inicia sesión"
            : "¿Primera vez? Crea una cuenta"}
        </button>
      </section>
    </main>
  );
}
