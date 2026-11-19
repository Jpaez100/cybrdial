import Link from "next/link";
import { SoftphonePanel } from "@/components/softphone/SoftphonePanel";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
            <span className="h-px w-6 bg-cyan-300/70" />
            Operations overview
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Command <span className="text-slate-500">center</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Your communications workspace. Monitor voice availability and
            connect with your contacts from one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-100"
            href="/contacts"
          >
            Manage contacts
          </Link>
          <Link
            className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.08] px-4 py-2.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-300/[0.14]"
            href="/messages"
          >
            Open messages
          </Link>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#101116]/80 p-5 sm:p-7">
            <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full border border-cyan-300/[0.08]" />
            <div className="absolute -right-4 -top-10 h-36 w-36 rounded-full border border-cyan-300/[0.08]" />
            <div className="relative max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                Live voice workspace
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
                Keep every conversation{" "}
                <span className="text-cyan-200">within reach.</span>
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Place browser-based calls, answer incoming calls, and manage
                conversations with your saved contacts.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  className="rounded-lg bg-cyan-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200"
                  href="/dashboard/calls"
                >
                  Open softphone
                </Link>
                <Link
                  className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
                  href="/contacts"
                >
                  View contacts
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-slate-800/80 bg-[#101116]/75 p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Contact directory
                </span>
                <span className="text-cyan-300">◎</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-100">
                People, one tap away
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Reach a saved contact by voice or SMS.
              </p>
              <Link
                className="mt-4 inline-flex text-xs font-semibold text-cyan-200 hover:text-cyan-100"
                href="/contacts"
              >
                Browse contacts <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            </article>
            <article className="rounded-2xl border border-slate-800/80 bg-[#101116]/75 p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Messaging
                </span>
                <span className="text-emerald-300">◌</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-100">
                Conversations in sync
              </h3>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Keep SMS threads close to your calling workflow.
              </p>
              <Link
                className="mt-4 inline-flex text-xs font-semibold text-emerald-200 hover:text-emerald-100"
                href="/messages"
              >
                Open inbox <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            </article>
          </div>
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <SoftphonePanel />
        </div>
      </section>
    </div>
  );
}
