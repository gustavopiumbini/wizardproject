// Perfil completo do Vibe Coding Toolkit (rev. 790a895, templates/eslint/next-app.config.mjs.example),
// ajustado à estrutura deste projeto.
import { defineConfig } from "eslint/config";
import drizzle from "eslint-plugin-drizzle";
import base from "./eslint-rules/next-base.mjs";

export default defineConfig([
  ...base,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { drizzle },
    rules: {
      "quality/no-direct-console": ["error", { logger: "o logger de servidor (src/lib/logger.ts)" }],
      "quality/no-direct-data-access": ["error", {
        modules: ["@/db", "@/db/index"], bindings: ["db", "pool"],
        layers: ["/src/app/", "/src/components/"], extensions: [".tsx"],
      }],
      "drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
      "drizzle/enforce-update-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
    },
  },
  {
    // O próprio logger é o único ponto autorizado a escrever no console.
    files: ["src/lib/logger.ts"],
    rules: { "quality/no-direct-console": "off" },
  },
]);
