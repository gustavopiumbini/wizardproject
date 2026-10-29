# Onboarding

**Estado:** ainda não há aplicação. Esta página descreve o que já vale e o que o `/inc1` precisa completar.

## Pré-requisitos

- Node.js (o `/inc1` deve fixar a versão suportada, por exemplo em `package.json` `engines`), pnpm e Docker com Compose.
- Claude Code na raiz do repositório. Ao abrir uma sessão, o cliente lê `CLAUDE.md` → `AGENTS.md` e oferece os plugins e marketplaces declarados em `.claude/settings.json` (pode pedir confirmação de confiança no primeiro uso).

## Primeiro uso

1. Leia `PRODUCT.md` e `AGENTS.md`.
2. Rode `/inc1` no Claude Code para criar a fundação.
3. Depois do `/inc1`: `docker compose up -d`, `pnpm install`, `pnpm db:migrate`, `pnpm db:seed` e `pnpm dev` (o `/inc1` deve confirmar ou corrigir esta sequência).

## Banco de dados

PostgreSQL local via Docker Compose, com dados fictícios do seed. Nunca use dados reais nem credenciais de produção em desenvolvimento; o `.env.example` (criado no `/inc1`) nunca deve conter segredos.

## Verificar

`pnpm typecheck && pnpm lint && pnpm lint:typed && pnpm lint:rules && pnpm test` e `pnpm test:e2e` (disponíveis após o `/inc1`). Detalhes em `docs/quality.md`.

## Agentes

- Regras e comandos: `AGENTS.md`. Específico do Claude: `CLAUDE.md`.
- Ferramentas instaladas, escopos e pendências: `docs/setup.md`.
- No ambiente de nuvem, instalações globais (RTK, Graphify, agent-browser) se perdem entre sessões; só persistem pelo script de setup do ambiente (ver `docs/setup.md`).

## Problemas conhecidos

Nenhum ainda.
