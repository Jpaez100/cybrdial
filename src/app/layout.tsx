import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cybrdial",
  description: "Command center for calls, messages, and contacts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
