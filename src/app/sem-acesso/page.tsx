import { signOutAction } from "@/modules/identity/actions";
import { Button } from "@/components/ui/button";

export default function NoAccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold">Sem acesso a unidades</h1>
      <p className="text-muted-foreground">Sua conta ainda não tem vínculo com nenhuma unidade. Procure a coordenação da escola.</p>
      <form action={signOutAction}>
        <Button type="submit" variant="outline">Sair</Button>
      </form>
    </main>
  );
}
