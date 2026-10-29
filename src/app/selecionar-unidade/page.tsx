import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { selectUnitAction } from "@/modules/tenancy/actions";
import { unitChoicesPage } from "@/modules/tenancy/queries";

export const metadata: Metadata = { title: "Escolher unidade" };

const ROLE_LABEL = { org_manager: "Gestão", coordinator: "Coordenação", receptionist: "Recepção", teacher: "Professor" } as const;

export default async function SelectUnitPage() {
  const { session, units } = await unitChoicesPage();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Escolha a unidade</h1>
        <p className="text-sm text-muted-foreground">
          {session.userName}, você tem acesso a mais de uma unidade. Os dados exibidos serão só os da unidade escolhida.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {units.map((u) => (
          <li key={u.unitId}>
            <form action={selectUnitAction} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <input type="hidden" name="unitId" value={u.unitId} />
              <div>
                <p className="font-medium">{u.unitName}</p>
                <p className="text-sm text-muted-foreground">
                  {u.organizationName} · {u.roles.map((r) => ROLE_LABEL[r]).join(", ")}
                </p>
              </div>
              <Button type="submit" variant="outline" className="h-10">
                Entrar
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
