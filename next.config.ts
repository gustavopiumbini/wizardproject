import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes de servidor que não devem ser empacotados.
  serverExternalPackages: ["pg", "pg-boss"],
  poweredByHeader: false,
};

export default nextConfig;
