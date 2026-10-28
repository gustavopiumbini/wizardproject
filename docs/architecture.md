# Arquitetura

**Estado:** nada implementado. Tudo abaixo é **plano** derivado de `AGENTS.md` e `docs/spec.md`; atualize esta página com a estrutura real a cada incremento.

## Stack

Fixa (ver `AGENTS.md`): Next.js App Router + TypeScript strict, PostgreSQL + Drizzle ORM com migrações versionadas, Better Auth com sessões no banco, Zod nas fronteiras, pg-boss num worker separado, Tailwind + shadcn/ui, Vitest + Playwright, pnpm, Docker Compose (Postgres + Mailpit). Versões exatas serão registradas aqui quando o `/inc1` instalar os pacotes.

## Mapa de código (plano)

- `src/app/` — rotas e UI em pt-BR.
- `src/modules/<modulo>/` — `schema.ts`, `service.ts`, `policy.ts`, `actions.ts` e testes. Módulos: identity, tenancy, academic, schedule, attendance, makeup, followup, materials, notifications, integration, audit.
- `src/adapters/email|whatsapp|sponte/` — integrações externas, isoladas da lógica de negócio.
- `src/worker/` — jobs pg-boss, outbox e agendador.
- `src/lib/context.ts` — `requireContext()` com usuário, organização e unidade autenticados.

## Fronteiras e fluxo (plano)

- Toda leitura ou escrita operacional: `requireContext()` → `can(ctx, acao, recurso)` → serviço do módulo filtrando por `organizationId`/`unitId` da sessão (regras 1 e 2 do `AGENTS.md`).
- Entradas externas (server actions, route handlers, importações, payloads de jobs) validadas com Zod.
- Envios saem só pela outbox; o worker recarrega o contexto e revalida tenancy, versão, cancelamento e vínculo (regra 8).
- Adaptadores sem credencial aparecem como "não ativado" (regra 3).

## Dados e migrações (plano)

Modelo mínimo e restrições obrigatórias: spec §19. Tempos em `timestamptz` UTC com fuso por unidade (regra 10). Conflitos de agenda verificados no banco (regra 9; a escolha entre restrição de exclusão e lock é do `/inc2` e vai para `docs/decisoes.md`). Migrações geradas e revisadas antes de aplicar; nunca durante build ou requisição.

## Decisões

Registradas em `docs/decisoes.md`.

## Manutenção

Ao final de cada incremento, troque "plano" por estrutura observada e registre versões reais.
