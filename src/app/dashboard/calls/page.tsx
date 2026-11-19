import Link from "next/link";
import { SoftphonePanel } from "@/components/softphone/SoftphonePanel";

export default function CallsPage() {
  return (
    <section className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
            Voice console
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Calls
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Make and receive calls with your browser softphone.
          </p>
        </div>
        <Link
          className="text-xs font-semibold text-slate-400 transition hover:text-cyan-200"
          href="/dashboard"
        >
          ← Back to command center
        </Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-h-[360px] flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#101116]/75 p-6 sm:p-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
              WebRTC enabled
            </span>
            <h2 className="mt-6 max-w-lg text-3xl font-semibold leading-tight tracking-tight text-slate-100">
              Clear connections,
              <br />
              <span className="text-slate-500">direct from your workspace.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-500">
              Allow microphone access when prompted. Enter a destination in
              international E.164 format to start an outbound call.
            </p>
          </div>
          <p className="mt-10 border-t border-slate-800/80 pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
            Voice traffic · encrypted signaling · Twilio
          </p>
        </div>
        <SoftphonePanel />
      </div>
    </section>
  );
}
