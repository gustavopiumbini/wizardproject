---
description: Incremento 1 — fundação, isolamento multiescola e fluxo vertical da chamada
---

# Incremento 1 — Fundação e fluxo vertical

Leia `CLAUDE.md` e as seções 1, 4, 5, 6, 7, 11, 19 e 22 de `docs/spec.md`. Entre em plan mode e apresente um plano curto antes de editar.

## Entregar

1. **Base do projeto** com a stack do `CLAUDE.md`: Docker Compose (Postgres + Mailpit), scripts do pnpm, `.env.example` sem segredos, ESLint e TypeScript strict.
2. **Identidade e tenancy:** Better Auth, Organization, SchoolUnit, Membership com papel, `requireContext()` e seleção de unidade quando o usuário tiver mais de uma.
3. **Permissões:** `can(ctx, acao, recurso)` com negação por padrão, e a matriz de permissões documentada em `docs/permissoes.md`.
4. **Acadêmico mínimo:** TeacherProfile, Student, ClassGroup, ClassMembership (com início e fim), Room, LessonOccurrence, LessonParticipant e TeacherAssignment.
5. **Frequência:** AttendanceRecord (não registrado por padrão), rascunho e finalização, AttendanceRevision com motivo e valores antes e depois.
6. **Seed** com 2 organizações (uma com 2 unidades), datas relativas a hoje e a faixa de modo demonstrativo.
7. **Telas:** login, Hoje (professor, mobile-first), Detalhe da aula com chamada e uma visão de chamadas da coordenação.

## Fluxo que precisa funcionar de ponta a ponta

Professor faz login → Hoje → abre a aula → vê a lista correta de alunos → marca a chamada → salva o rascunho → finaliza → a coordenação vê o mesmo resultado.

## Testes obrigatórios (critérios da spec §23)

1, 2, 3, 4, 13 e 18, com Postgres real. Inclua um e2e do fluxo acima.

## Ao terminar

- Rode `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` e relate os resultados reais.
- Rode o subagente `revisor-isolamento`.
- Atualize `docs/status.md`, `docs/decisoes.md` e a lista de comandos do `CLAUDE.md`.
- Pare e apresente o resumo. Não comece o incremento 2 sem pedido.
