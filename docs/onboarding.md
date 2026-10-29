# Onboarding

**Estado:** a aplicação do incremento 1 roda localmente com dados fictícios.

## Pré-requisitos

- Node.js ≥ 22.12 (`package.json` `engines`), pnpm 10 e Docker com Compose.
- Claude Code na raiz do repositório. Ao abrir uma sessão, o cliente lê `CLAUDE.md` → `AGENTS.md` e oferece os plugins e marketplaces declarados em `.claude/settings.json` (pode pedir confirmação de confiança no primeiro uso).

## Primeiro uso

```
cp .env.example .env          # preencha BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d          # Postgres em :5432 e Mailpit em :8025
pnpm install
pnpm db:migrate
pnpm db:seed                  # recria os dados demo com datas relativas a hoje
pnpm dev                      # http://localhost:3000
```

No container de nuvem, o daemon do Docker pode não estar ativo: inicie com `dockerd &` antes do `docker compose up -d`.

## Contas demo

Senha de todas: `demo-aula-em-dia` (só desenvolvimento; o seed recusa rodar em produção).

| Conta | Papel | Para ver |
|---|---|---|
| `prof.rafael@horizonte.example` | Professor, unidade Centro | Hoje, chamada da TEENS-2A |
| `prof.julia@horizonte.example` | Professora substituta, Centro | Só a aula de KIDS-1 de hoje (substituição) |
| `prof.marina@horizonte.example` | Professora em duas unidades | Seleção de unidade (Centro e Bairro Alto) |
| `coordenacao@horizonte.example` | Coordenação, Centro | Visão de chamadas, correções |
| `recepcao@horizonte.example` | Recepção, Centro | Visão de chamadas (somente leitura) |
| `gestora@horizonte.example` | Gestão da organização | As duas unidades da Escola Horizonte |
| `coordenacao@ponte.example`, `prof.tiago@ponte.example` | Outra organização | Isolamento: não veem nada da Horizonte |

Cenários do seed: chamada finalizada na semana passada, aluno transferido de turma há 3 dias (aparece na aula passada da TEENS-2A e não nas seguintes), chamada não registrada ontem, troca de professor hoje e aula cancelada amanhã.

## Banco de dados

PostgreSQL local via Docker Compose, só com dados fictícios. Nunca use dados reais nem credenciais de produção em desenvolvimento; o `.env.example` não contém segredos. Os testes criam bancos descartáveis (`aula_test_*` no Vitest, `aula_e2e` no Playwright) no mesmo Postgres.

## Verificar

`pnpm typecheck && pnpm lint && pnpm lint:typed && pnpm lint:rules && pnpm test` e `pnpm test:e2e`. Detalhes em `docs/quality.md`.

## Agentes

- Regras e comandos: `AGENTS.md`. Específico do Claude: `CLAUDE.md`.
- Ferramentas instaladas, escopos e pendências: `docs/setup.md`.
- No ambiente de nuvem, instalações globais (RTK, Graphify, agent-browser) se perdem entre sessões; só persistem pelo script de setup do ambiente (ver `docs/setup.md`).

## Problemas conhecidos

- `pnpm install` avisa peer `eslint ≤9` em plugins do preset do Next; ver `docs/decisoes.md`.
- O `pnpm test:e2e` usa a porta 3100; feche outro `next dev` nessa porta antes de rodar.
