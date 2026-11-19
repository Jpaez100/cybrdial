import Link from "next/link";
import { SoftphonePanel } from "@/components/softphone/SoftphonePanel";

export default function CallsPage() {
  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Consola de voz
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Llamadas
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Realiza y recibe llamadas con tu softphone del navegador.
          </p>
        </div>
        <Link
          className="text-xs font-semibold text-slate-400 transition hover:text-cyan-200"
          href="/dashboard"
        >
          ← Volver al centro de comando
        </Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-h-[360px] flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#101116]/75 p-6 sm:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              WebRTC habilitado
            </span>
            <h2 className="mt-6 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-slate-100">
              Conexiones claras,
              <br />
              <span className="text-slate-400">directamente desde tu espacio.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
              Permite el acceso al micrófono. Introduce un destino en formato
              internacional E.164 para iniciar una llamada saliente.
            </p>
          </div>
          <p className="mt-10 border-t border-slate-800/80 pt-4 font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
            Tráfico de voz · señalización cifrada · Twilio
          </p>
        </div>
        <SoftphonePanel />
      </div>
    </section>
  );
}
