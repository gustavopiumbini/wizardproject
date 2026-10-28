# Aula em Dia — produto

Resumo e índice. A fonte de verdade do produto é `docs/spec.md`; este arquivo não repete regras e aponta para as seções.

## Problema e objetivo

Numa unidade de escola de idiomas, reposições, faltas, fichas de alunos e mudanças de turma circulam entre o Sponte, planilhas, fichas em papel e grupos de WhatsApp, e se perdem ou ficam desatualizadas. Objetivo: cada informação operacional tem um registro principal definido, que gera as visões de que cada pessoa precisa (spec §1).

O relato comprova a necessidade em uma unidade; não é validação comercial na rede nem autorização do franqueador.

## Público e perfis

Gestor da organização, coordenação, recepção, professor e dispositivo de TV, com permissões no servidor (spec §2 e §6). Multiescola desde o início: organizações, unidades e vínculos explícitos (spec §5).

## MVP

Autenticação e isolamento entre escolas; perfis e permissões; cadastros mínimos; agenda e visão do professor; reposições vinculadas à origem; ciência versionada do professor; ficha digital e chamada; faltas e contatos; notificações (interna real, e-mail configurável, WhatsApp só por adaptador oficial); histórico e concorrência; integração Sponte por adaptador com modo demonstrativo; exportação e recuperação (spec §3).

Entregue em cinco incrementos, sem pular etapas: `/inc1` fundação e chamada, `/inc2` agenda e reposições, `/inc3` faltas e notificações, `/inc4` importação e Sponte, `/inc5` exportações e piloto (`.claude/commands/`).

## Fora do escopo

Financeiro escolar, emissão fiscal, mensalidades, folha de pagamento, editor completo de apresentações, app nativo e IA (spec §3; regra 12 do `AGENTS.md`).

## Restrições

- Stack fixa: Next.js + TypeScript strict, PostgreSQL + Drizzle, Better Auth, Zod, pg-boss, Tailwind/shadcn, Vitest/Playwright, pnpm e Docker Compose (`AGENTS.md`).
- Propriedade dos dados e modos de operação com o Sponte: spec §4. Nada de endpoints inventados nem automação de telas.
- UI e documentação em pt-BR; mobile-first para o professor; acessibilidade (spec §18).
- Dados mínimos, pois pode haver menores (spec §6, §21).

## Suposições e decisões pendentes

As dez perguntas abertas para a escola (spec §26) estão sem resposta em `docs/decisoes.md`. Nenhuma bloqueia a demo; as respostas 1, 3, 4 e 5 definem o escopo do `/inc4` (sem elas, só importação por arquivo).

## Critérios de aceitação

Os 20 critérios da spec §23. Cada incremento declara quais deve provar com testes.

## Próxima entrega

`/inc1`: fundação do projeto, isolamento multiescola e o fluxo vertical da chamada (professor faz login → Hoje → aula → chamada → finaliza → coordenação vê o mesmo resultado).

## Manutenção

Mudanças de objetivo, escopo ou critérios vão primeiro para `docs/spec.md`; ajuste este resumo só se o índice ficar errado.
