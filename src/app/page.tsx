import { redirect } from "next/navigation";
import { requireContext } from "@/lib/context";

export default async function Home() {
  const ctx = await requireContext();
  redirect(ctx.teacherProfileId ? "/hoje" : "/coordenacao/chamadas");
}
