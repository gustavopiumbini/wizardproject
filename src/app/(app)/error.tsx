"use client";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <h1 className="text-lg font-semibold">Não foi possível carregar esta página</h1>
      <p className="text-muted-foreground">Verifique sua conexão e tente novamente. Se o problema continuar, avise a coordenação.</p>
      <Button onClick={reset} variant="outline">
        Tentar novamente
      </Button>
    </div>
  );
}
