import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/modules/identity/actions";
import { can, unitResource } from "@/modules/tenancy/policy";
import { appShellData } from "@/modules/tenancy/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { ctx, userName, canSwitchUnit } = await appShellData();
  const nav = [
    ctx.teacherProfileId && can(ctx, "lesson.listOwn", unitResource(ctx)) ? { href: "/hoje", label: "Hoje" } : null,
    can(ctx, "attendance.overview", unitResource(ctx)) ? { href: "/coordenacao/chamadas", label: "Chamadas" } : null,
  ].filter((item) => item !== null);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{ctx.unitName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {ctx.organizationName} · {userName}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {canSwitchUnit && (
              <Link href="/selecionar-unidade" className="rounded-md px-2 py-2 text-sm underline-offset-4 hover:underline">
                Trocar unidade
              </Link>
            )}
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="lg">
                Sair
              </Button>
            </form>
          </div>
        </div>
        <nav aria-label="Principal" className="mx-auto flex w-full max-w-4xl gap-1 px-2 pb-2">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-5">{children}</main>
      <footer className="px-4 py-3 text-center text-xs text-muted-foreground">
        Requer conexão com a internet: esta versão não funciona offline.
      </footer>
    </div>
  );
}
