import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-12">
      <h1 className="text-xl font-semibold">Não encontrado</h1>
      <p className="text-muted-foreground">O registro não existe ou você não tem acesso a ele nesta unidade.</p>
      <Link href="/" className="underline underline-offset-4">
        Voltar ao início
      </Link>
    </main>
  );
}
