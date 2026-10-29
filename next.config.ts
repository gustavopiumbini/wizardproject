import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes de servidor que não devem ser empacotados.
  serverExternalPackages: ["pg", "pg-boss"],
  poweredByHeader: false,
  // Não deixar o `next dev` reescrever o AGENTS.md (regras curadas no próprio arquivo).
  agentRules: false,
};

export default nextConfig;
