# Qualidade

**Estado:** todas as verificações abaixo existem e rodam desde o `/inc1`.

## Comandos

| Comando | Prova | Medição no runner de nuvem (2026-10-29) |
|---|---|---|
| `pnpm typecheck` | TypeScript strict sem erros (`noUncheckedIndexedAccess` ligado) | 6,4 s |
| `pnpm lint` | ESLint (presets oficiais + regras do toolkit abaixo) | 3,1 s |
| `pnpm test` | Vitest: unidade e integração com Postgres real via Docker, banco `aula_test_*` criado e apagado por execução | 4,3 s (28 testes) |
| `pnpm test:e2e` | Playwright (Chromium, viewport Pixel 7): recria `aula_e2e`, aplica migrações e seed, sobe `next dev` na porta 3100 | 23,6 s (2 testes) |
| `pnpm lint:typed` | Regras tipadas de promessas (`no-floating-promises`, `no-misused-promises`) como erro, só em `src/` | 8,5 s (memória não medida) |
| `pnpm lint:rules` | Self-check das regras locais de ESLint (RuleTester) | 0,7 s |

Verificação combinada antes de declarar pronto: `pnpm typecheck && pnpm lint && pnpm lint:typed && pnpm lint:rules && pnpm test`, mais os e2e do incremento. Rode testes focados durante o trabalho e a suíte completa no fim. Relate apenas o que rodou de fato.

## Regras de base (aplicadas no `/inc1`)

Fonte: Vibe Coding Toolkit, revisão `790a895304e0c08b70a5b215c9d334f1c86b816c`. Copiados da mesma revisão: `templates/eslint/next-app.config.mjs.example` → `eslint.config.mjs`, `templates/eslint/eslint-rules/` → `eslint-rules/`, `templates/eslint/verify.mjs` → `scripts/verify-quality-rules.mjs`, `templates/eslint/next.typed.config.mjs.example` → `eslint.typed.config.mjs`. Ajustes ao projeto em `docs/decisoes.md`.

Regras ativas: presets `core-web-vitals` e `typescript` do Next; `quality/max-lines` 350 por arquivo; `quality/no-direct-console` (servidor usa `src/lib/logger.ts`); `quality/no-direct-data-access` (páginas e componentes `.tsx` em `src/app`/`src/components` não importam `@/db`); `drizzle/enforce-update-with-where` e `enforce-delete-with-where` para `db` e `tx`. Essas regras não substituem `requireContext()`, `can()`, validação Zod nem revisão.

## Estratégia de testes

- Os critérios da spec §23 são os testes obrigatórios; cada incremento lista os seus.
- Isolamento multiescola sempre com tentativa de acesso cruzado usando IDs conhecidos de outra organização.
- Integração com Postgres real em Docker, banco descartável por execução; nunca dados reais.
- Concorrência (critério 12) com reservas simultâneas de verdade.
- Provedores externos simulados de forma explícita; nenhum envio real. Mock, SQL gerado e banco real são evidências diferentes.
- Não escreva testes que só repetem a implementação. Não declare cobertura que não foi medida.

Testes por critério da spec §23 (incremento 1): 1 e 2 em `src/modules/tenancy/isolation.test.ts`; 3, 4 e 18 em `src/modules/attendance/attendance.test.ts`; 13 em `src/modules/academic/transfer.test.ts`; matriz de `can()` em `src/modules/tenancy/policy.test.ts`; limite de login em `src/modules/identity/throttle.test.ts`; logger sem dados de consulta em `src/lib/logger.test.ts`; fluxo ponta a ponta e seleção de unidade em `e2e/chamada.spec.ts`.

Capacidades adotadas e quando provar cada uma:

- `next-dev-loop`: há servidor Next.js 16 com Turbopack, mas o agent-browser não está instalado na nuvem; no /inc1 a verificação visual foi feita com screenshots do Playwright.
- `next-bundle-optimizer`: auditoria com medições comparáveis; sem uso até haver build.
- `supabase-postgres-best-practices`: revisão de esquema, índices e migrações geradas antes de aplicar.
- `shadcn`: `components.json` existe (estilo `base-nova`, Base UI, ícones lucide); inspecione antes de alterar componentes.
- `differential-review`: diffs de tenancy, permissões, jobs e exportações.

## Revisão após implementação ou correções

Escopo pela mudança real e pelo risco: requisitos e comportamento; regressões e testes; segurança e tenancy; integrações e configuração; acessibilidade; desempenho medido. Mudanças não triviais recebem revisão independente quando disponível; o subagente `revisor-isolamento` é obrigatório em `policy.ts`, consultas multiescola, exportações, downloads, jobs e notificações. Termine quando os achados relevantes estiverem resolvidos ou justificados, as verificações afetadas passarem e os riscos residuais estiverem registrados. Rodadas extras só com evidência nova, risco aberto ou pedido explícito.

## Revisão de segurança

Prompt reutilizável em `docs/prompts/revisao-seguranca.md` (bloco do prompt 13 do toolkit, mesma revisão). Modo repositório para linha de base; modo diff (`base`, `head`, comparação e camadas sujas explícitas) para mudanças, usando `differential-review` quando compatível. É somente leitura; o relatório é privado e fica **fora do repositório**. Achados não são corrigidos sem pedido separado. Nenhum achado não significa projeto seguro.

## Avaliação e melhoria do harness

- Modo adotado: adaptação nativa do método Harness2 (prompt 15 do toolkit), sem executar o framework nem benchmarks.
- Quando reavaliar: depois de mudar `AGENTS.md`, `CLAUDE.md`, comandos, agentes, skills ou plugins. Peça ao agente: "Leia `https://raw.githubusercontent.com/soumatheusgomes/vibe-coding-toolkit/790a895304e0c08b70a5b215c9d334f1c86b816c/docs/prompts/14-harness-evaluation.md` e execute a seção Prompt em cópias descartáveis". Para uma falha observada, use o prompt 15 da mesma revisão (uma comparação de candidato por vez).
- Resultados iniciais: `docs/setup.md`.

## Dependências e entrega

Rode auditoria completa e de produção após instalar dependências; investigue avisos e registre riscos conhecidos. Estado em 2026-10-29: `pnpm audit --prod` aponta 1 moderado (esbuild ≤0.24 via `better-auth` → peer `drizzle-kit` → `@esbuild-kit`; afeta só o servidor de desenvolvimento do esbuild, que o projeto não usa) e `pnpm audit` aponta também 1 baixo (deepmerge via CLI do shadcn, dependência de desenvolvimento). Sem correção publicada; reavaliar ao atualizar drizzle-kit. Lint e build passando não significam auditoria limpa. Sem hooks de Git, bloqueios de push ou exigência de branch. Atualize esta página junto com scripts e regras que mudarem.
