import Link from "next/link";
import { VoiceStatusIndicator } from "@/components/dashboard/VoiceStatusIndicator";
import { TwilioVoiceProvider } from "@/context/TwilioVoiceContext";

const navigation = [
  { href: "/dashboard", label: "Command center", icon: "⌂" },
  { href: "/dashboard/calls", label: "Calls", icon: "↗" },
  { href: "/messages", label: "Messages", icon: "◌" },
  { href: "/contacts", label: "Contacts", icon: "◎" },
];

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <TwilioVoiceProvider>
      <div className="relative min-h-screen overflow-hidden bg-[#09090B] text-slate-100">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden"
        >
          <div className="absolute -left-48 -top-56 h-[34rem] w-[34rem] rounded-full bg-cyan-500/[0.055] blur-[120px]" />
          <div className="absolute -right-56 top-[28rem] h-[32rem] w-[32rem] rounded-full bg-emerald-500/[0.045] blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(148,163,184,0.12)_0.65px,transparent_0.65px)] bg-[size:24px_24px] opacity-[0.12]" />
        </div>

        <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#09090B]/75 shadow-[0_8px_40px_-24px_rgba(34,211,238,0.2)] backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5 sm:px-7 lg:px-10">
            <Link
              className="group flex items-center gap-3"
              href="/dashboard"
            >
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/[0.08] shadow-[inset_0_0_20px_rgba(34,211,238,0.08)]">
                <span className="absolute inset-1 rounded-lg border border-cyan-200/10" />
                <svg
                  aria-hidden="true"
                  className="text-cyan-300 transition group-hover:text-cyan-200"
                  fill="none"
                  height="21"
                  viewBox="0 0 24 24"
                  width="21"
                >
                  <path
                    d="M7.1 3.8L10 3L12 8L9.8 9.7C10.8 11.8 12.2 13.2 14.3 14.2L16 12L21 14L20.2 16.9C19.9 18 18.9 18.7 17.8 18.6C10.9 18.1 5.9 13.1 5.4 6.2C5.3 5.1 6 4.1 7.1 3.8Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>
              <span>
                <span className="block text-[15px] font-bold tracking-[0.12em] text-slate-100">
                  CYBR<span className="text-cyan-300">DIAL</span>
                </span>
                <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.28em] text-slate-500">
                  Communications OS
                </span>
              </span>
            </Link>

            <nav
              aria-label="Navegación principal"
              className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto sm:gap-1.5"
            >
              {navigation.map((item) => (
                <Link
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-slate-800 hover:bg-slate-900/80 hover:text-slate-100"
                  href={item.href}
                  key={item.href}
                >
                  <span aria-hidden="true" className="text-sm text-cyan-400/80">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <VoiceStatusIndicator />
              <Link
                className="hidden rounded-full border border-slate-800 bg-slate-900/70 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-100 sm:block"
                href="/login"
              >
                Account
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto min-h-[calc(100vh-118px)] max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
          {children}
        </main>

        <footer className="relative z-10 border-t border-slate-900/90 px-4 py-4 text-center text-[10px] uppercase tracking-[0.2em] text-slate-600">
          CybrDial · Secure communications infrastructure
        </footer>
      </div>
    </TwilioVoiceProvider>
  );
}
