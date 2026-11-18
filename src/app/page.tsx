import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Cybrdial</h1>
      <p>Centro de control de llamadas, mensajes y contactos.</p>
      <Link href="/dashboard">Abrir el panel</Link>
    </main>
  );
}
