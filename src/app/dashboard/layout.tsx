import Link from "next/link";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main>
      <header>
        <h1>Cybrdial · Command Center</h1>
        <nav aria-label="Navegación principal">
          <Link href="/dashboard">Inicio</Link>
          <Link href="/dashboard/calls">Llamadas</Link>
          <Link href="/dashboard/messages">Mensajes</Link>
          <Link href="/dashboard/contacts">Contactos</Link>
        </nav>
      </header>
      {children}
    </main>
  );
}
