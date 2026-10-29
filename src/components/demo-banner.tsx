import { connection } from "next/server";

// Regra 3: o modo demonstrativo é sempre identificado. Lido por requisição, não no build.
export async function DemoBanner() {
  await connection();
  if (process.env.DEMO_MODE !== "true") return null;
  return (
    <div role="note" className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950">
      Ambiente demonstrativo — sem conexão com Sponte
    </div>
  );
}
