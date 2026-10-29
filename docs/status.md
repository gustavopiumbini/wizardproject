# Status das funcionalidades

Atualize ao final de cada incremento. Só entra em "Implementado" o que foi testado de verdade.

## Implementado

Incremento 1 (2026-10-29), testado com Postgres real e e2e:

- Base: Docker Compose (Postgres 17 + Mailpit), scripts pnpm, TypeScript strict, ESLint do toolkit (perfil completo, tipado e self-check), migrações Drizzle versionadas.
- Identidade: login por e-mail e senha (Better Auth, sessões no banco, cadastro público desligado), logout, limite de tentativas de login por e-mail e por IP.
- Tenancy: organização, unidade (com fuso), vínculo com papel; `requireContext()`; seleção de unidade para quem tem mais de uma; FKs compostas impedem ligar registros de escolas diferentes.
- Permissões: `can()` com negação por padrão e matriz em `docs/permissoes.md`; professor só acessa aulas com vínculo ativo; substituto só a aula da substituição.
- Acadêmico mínimo: perfil docente, aluno, sala, turma, vínculo com turma (início e fim), ocorrência, lista congelada por ocorrência, vínculo docente; transferência de turma que preserva o passado (serviço, sem tela).
- Frequência: "não registrado" por padrão, rascunho, finalização com confirmação de pendentes, concorrência otimista, correção com motivo e histórico de antes e depois.
- Telas: login, seleção de unidade, Hoje (mobile-first), detalhe da aula com chamada e correção, visão de chamadas da coordenação por dia.

## Demonstrativo (funciona apenas com dados fictícios)

- Todo o app roda em modo demonstrativo (`DEMO_MODE=true`), com a faixa "Ambiente demonstrativo — sem conexão com Sponte".
- Seed com 2 organizações (uma com 2 unidades) e datas relativas a hoje. Cenários do inc1: chamada finalizada, chamada não registrada, troca de professor, cancelamento e aluno transferido de turma.
- Cenários da spec §22 que dependem de entidades ainda não criadas ficam para os incrementos correspondentes: reposição pendente de ciência e concluída (`/inc2`), conflito de horário (`/inc2`), falta em acompanhamento e falha de envio (`/inc3`), integração desatualizada (`/inc4`).

## Dependente de credenciais ou confirmação externa

- Integração Sponte (leitura e escrita): aguardando as respostas da §26 da spec.
- Envio de e-mail real: aguardando provedor e domínio. O Mailpit está no Compose, mas nenhum e-mail é enviado no inc1.
- WhatsApp oficial: aguardando decisão de canal, custos e responsável.
- Janela de correção do professor (24 h) e regra de finalização com pendentes: propostas, a validar com a escola (§26, pergunta 2).

## Planejado

- Incrementos 2 a 5 (`/inc2` … `/inc5`). Worker pg-boss existe e inicia, mas não tem jobs até o `/inc3`.
- Tela de transferência de turma e demais cadastros (administração).
- Pós-MVP: painel de TV, biblioteca de atividades, slides.

## Relatório de testes

- 2026-10-28 — Setup do toolkit (sem código de aplicação): validações em `docs/setup.md`.
- 2026-10-29 — Incremento 1, no container de nuvem (Node 22.22, Postgres 17 no Docker):
  - `pnpm typecheck`, `pnpm lint`, `pnpm lint:typed`, `pnpm lint:rules`: sem erros.
  - `pnpm test`: 6 arquivos, 28 testes passando. Critérios da §23 cobertos: 1, 2, 3, 4, 13 e 18.
  - `pnpm test:e2e`: 2 testes passando (fluxo professor → coordenação; seleção de unidade).
  - `pnpm build`: sem erros.
  - Mutação manual: remover a checagem de tenancy e de vínculo em `can()` fez 4 testes falharem.
  - `pnpm audit --prod`: 1 moderado sem correção publicada (ver `docs/quality.md`).
  - Revisão `revisor-isolamento`: sem bloqueantes; os 3 itens importantes (FK simples em `lesson_participant` → `class_membership`, mensagem de erro com parâmetros no log, login sem limite de tentativas) foram corrigidos, com teste.
