# Arquitetura

**Estado:** incremento 1 implementado (fundação, tenancy, permissões, acadêmico mínimo e chamada). Módulos dos incrementos seguintes continuam como plano e estão marcados.

## Stack e versões instaladas

Fixa (ver `AGENTS.md`). Versões em `package.json` e `pnpm-lock.yaml`; principais em 2026-10-29: Next.js 16.4.3, React 19.3.1, TypeScript 6.0.3, Drizzle ORM 0.45.4 / drizzle-kit 0.31.11, driver `pg` 8.23.1, Better Auth 1.7.14, Zod 4.6.7, pg-boss 12.38.0, Tailwind 4.3.3, shadcn 4.23.0 (estilo `base-nova`, Base UI), Vitest 5.0.5, Playwright 1.63.0, ESLint 10.13.0. Node ≥ 22.12. Postgres 17 (imagem `postgres:17-alpine`) e Mailpit no Docker Compose. Motivos das escolhas de versão em `docs/decisoes.md`.

## Mapa de código

```
src/app/                         rotas e UI (pt-BR)
  login/, selecionar-unidade/, sem-acesso/
  (app)/layout.tsx               cabeçalho, navegação por papel, aviso de "sem offline"
  (app)/hoje/                    aulas do professor no dia
  (app)/aulas/[id]/              ficha da aula, chamada (rascunho/finalização) e correção
  (app)/coordenacao/chamadas/    visão de chamadas da unidade por dia
src/components/                  faixa demonstrativa, badges de estado, componentes shadcn em ui/
src/db/                          cliente (index.ts), schema.ts (agrega módulos), tenant.ts (FKs compostas),
                                 migrate.ts, seed.ts, factories.ts (apoio a seed e testes)
src/lib/                         auth.ts (Better Auth), context.ts (requireSession/requireContext),
                                 logger.ts, time.ts (fuso da unidade), errors.ts, action-result.ts
src/modules/identity/            tabelas do Better Auth; actions de login/logout
src/modules/tenancy/             organization, school_unit, membership; loadContext(); policy.ts (can)
src/modules/academic/            teacher_profile, student, room, class_group, class_membership,
                                 lesson_occurrence, lesson_participant, teacher_assignment; transferência
src/modules/attendance/          attendance_sheet, attendance_record, attendance_revision; serviço,
                                 queries (leitura para páginas), actions (Zod), rótulos
src/worker/index.ts              inicia o pg-boss; nenhum job até o /inc3
src/test/                        global-setup (banco descartável) e fixtures com duas escolas
e2e/                             Playwright
drizzle/                         migrações versionadas
eslint-rules/, scripts/          regras locais do toolkit e self-check
```

Módulos ainda planejados: schedule, makeup, followup, materials, notifications, integration, audit; `src/adapters/email|whatsapp|sponte/`.

## Fronteiras e fluxo

- Página → `queries.ts` do módulo (`server-only`) → `requireContext()` → serviço. Mutação → `actions.ts` (`"use server"`, Zod) → `requireContext()` → serviço. Páginas e componentes não importam o banco (regra `quality/no-direct-data-access`).
- Serviços recebem `(db, ctx, input)`, filtram toda consulta por `organizationId`/`unitId` do contexto e chamam `can()` antes de ler ou escrever. Recurso de outra escola responde `not_found`.
- `requireContext()` só lê (pode rodar em GET). A troca de unidade é uma server action (POST) que revalida o vínculo antes de gravar `session.active_unit_id`.
- Erros de domínio são `AppError` com código estável; `toErrorState()` converte para a UI sem vazar detalhes. Logs vão pelo `logger` em JSON, só com IDs e códigos.
- Login por server action com `auth.api.signInEmail` e o plugin `nextCookies`. Cadastro público desligado (`disableSignUp`). A rota HTTP do Better Auth (`/api/auth/*`) não está montada: nada no inc1 precisa dela.

## Dados e migrações

- Toda tabela operacional tem `organization_id` + `unit_id`, e as FKs entre elas são compostas `(id, organization_id, unit_id)` (`src/db/tenant.ts`). O banco recusa ligar entidades de escolas diferentes.
- `membership`: um vínculo por papel; `unit_id` nulo só para `org_manager` (restrição `membership_unit_scope_ck`).
- `class_membership` com `starts_on`/`ends_on`; só um vínculo aberto por aluno e turma. Transferência encerra o vínculo na véspera da data efetiva e nunca apaga.
- `lesson_participant` é a lista congelada de cada ocorrência, montada a partir dos vínculos válidos na data. Retirada marca `removed_at`; aula passada não muda.
- `teacher_assignment`: um vínculo ativo por ocorrência (índice único parcial). Substituição encerra o anterior.
- `attendance_record` único por `(lesson_id, participant_id)`, com FK que garante que o participante é daquela aula. `attendance_sheet` guarda rascunho/finalização e a versão para concorrência otimista. `attendance_revision` é só inserção, com motivo obrigatório (checagem no banco).
- Tempos em `timestamptz` (UTC). O fuso é da unidade (`school_unit.timezone`, padrão `America/Sao_Paulo`) e é usado para "hoje", limites do dia e exibição (`src/lib/time.ts`).
- Migrações geradas com `pnpm db:generate`, revisadas e aplicadas com `pnpm db:migrate`; nunca durante build ou requisição.

## Decisões

Registradas em `docs/decisoes.md`.

## Manutenção

Ao final de cada incremento, troque "plano" por estrutura observada e registre versões reais.
