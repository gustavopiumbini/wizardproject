import type { Metadata, Viewport } from "next";
import { DemoBanner } from "@/components/demo-banner";
import "./globals.css";

export const metadata: Metadata = { title: { default: "Aula em Dia", template: "%s · Aula em Dia" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
