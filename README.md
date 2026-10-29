# Aula em Dia

SaaS multiescola para coordenar aulas, professores, chamadas, faltas e reposições em escolas de idiomas e cursos livres. Nome provisório; sem vínculo oficial com Wizard, Pearson ou Sponte.

**Estado atual:** incremento 1 entregue (fundação, isolamento multiescola, permissões e fluxo da chamada, em modo demonstrativo). Situação detalhada em `docs/status.md`.

## Executar

```
cp .env.example .env    # preencha BETTER_AUTH_SECRET
docker compose up -d
pnpm install && pnpm db:migrate && pnpm db:seed
pnpm dev
```

Contas demo e passo a passo em `docs/onboarding.md`; todos os comandos em `AGENTS.md` (seção Comandos).

Para trabalhar com o Claude Code: abra uma sessão na raiz do repositório e rode `/inc1`. Os incrementos seguintes (`/inc2` … `/inc5`) só começam depois do anterior estar concluído em `docs/status.md`.

## Documentação

- `PRODUCT.md` — resumo do produto e índice da especificação
- `docs/spec.md` — especificação completa
- `AGENTS.md` — regras e comandos para qualquer agente; `CLAUDE.md` — complemento do Claude Code
- `docs/architecture.md`, `docs/permissoes.md`, `docs/design.md`, `docs/onboarding.md`, `docs/quality.md`
- `docs/status.md`, `docs/decisoes.md`, `docs/setup.md`

## Próxima entrega

Incremento 2 (`/inc2`): agenda, conflitos, reposições e ciência versionada.
