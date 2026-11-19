import { cookies } from "next/headers";
import Link from "next/link";
import {
  getAuthenticatedUserFromToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { TwilioVoiceProvider } from "@/context/TwilioVoiceContext";
import { WidgetDialer } from "./WidgetDialer";
import { WidgetAuthState } from "./WidgetAuthState";

export default async function WidgetPage() {
  const cookieStore = await cookies();
  const user = await getAuthenticatedUserFromToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090B] p-3 text-slate-100">
        <WidgetAuthState />
        <section className="w-full rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 text-center backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            CybrDial
          </p>
          <h1 className="mt-3 text-lg font-semibold text-slate-100">
            Inicia sesión para usar el widget
          </h1>
          <p className="mt-2 text-sm leading-5 text-slate-400">
            Debes autenticarte en CybrDial antes de realizar llamadas o SMS.
          </p>
          <Link
            className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
            href="/login?next=/widget"
            target="_top"
          >
            Iniciar sesión
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#09090B] p-3 text-slate-100">
      <div className="mx-auto max-w-[360px]">
        <TwilioVoiceProvider>
          <WidgetDialer />
        </TwilioVoiceProvider>
      </div>
    </main>
  );
}
