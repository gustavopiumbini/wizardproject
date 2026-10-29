import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Aula em Dia</h1>
        <p className="text-sm text-muted-foreground">Entre com a conta fornecida pela sua escola.</p>
      </div>
      <LoginForm />
    </main>
  );
}
