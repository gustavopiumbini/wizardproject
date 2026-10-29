# Registro de decisões

Formato: data — decisão — motivo — alternativas descartadas.

## 2026-10-28 — Stack fixa

**Decisão:** Next.js + TypeScript, Postgres + Drizzle, Better Auth, pg-boss, Tailwind/shadcn, Vitest + Playwright.

**Motivo:** monólito modular simples de operar num piloto; fila no próprio Postgres evita infraestrutura extra.

**Descartado:** microserviços, Redis/BullMQ (infraestrutura a mais sem necessidade no piloto).

## 2026-10-29 — Versões do /inc1

**Decisão:** TypeScript 6.0.3 (não 7.0), ESLint 10.13.0, Playwright 1.63.0, Postgres 17.

**Motivo:** `typescript-eslint` 8.72 declara `typescript <6.1`, e o `lint:typed` depende dele. ESLint 9 já está fora de suporte; o ESLint 10 rodou o preset do Next sem erro, embora `eslint-plugin-react`, `eslint-plugin-import` e `eslint-plugin-jsx-a11y` ainda declarem peer `eslint ≤9` (aviso do pnpm aceito; reavaliar quando publicarem suporte). Playwright 1.63 casa com o Chromium pré-instalado no ambiente de nuvem.

**Descartado:** TypeScript 7 (quebra o lint tipado); ESLint 9 (sem suporte).

## 2026-10-29 — Better Auth só para identidade; tenancy própria

**Decisão:** Better Auth cuida de usuário, sessão, conta e verificação (e-mail e senha, sessões no banco, cadastro público desligado). Organização, unidade e vínculo com papel são tabelas próprias (`organization`, `school_unit`, `membership`). A unidade ativa fica em `session.active_unit_id`, sempre revalidada contra os vínculos.

**Motivo:** a spec exige unidade dentro de organização, papéis por unidade, acúmulo explícito e gestor da organização sem acesso a outras escolas; o plugin de organização do Better Auth não modela unidades nem o perfil docente separado do usuário.

**Descartado:** plugin `organization` do Better Auth; unidade ativa em cookie próprio (o cliente poderia trocá-la sem passar pela validação no servidor).

## 2026-10-29 — Isolamento no banco com FKs compostas

**Decisão:** toda tabela operacional carrega `organization_id` e `unit_id`, e as FKs entre elas são compostas `(id, organization_id, unit_id)`. As consultas filtram pela tenancy do contexto e `can()` confere o recurso.

**Motivo:** regra 1 ("chaves estrangeiras não podem ligar entidades de escolas diferentes") vira invariante verificável no banco, não só convenção de código. Testado em `isolation.test.ts`.

**Descartado:** Row Level Security do Postgres (exigiria papel de banco por requisição e complica pool e migrações no piloto; pode ser camada extra depois); FK simples por `id` (permitiria ligação cruzada).

## 2026-10-29 — Regras da chamada

**Decisão:** ausência de registro = "não registrado". Finalizar com alunos não registrados exige confirmação explícita (não bloqueia). Depois de finalizada, toda mudança é correção com motivo (mín. 5 caracteres), gravada em `attendance_revision`; o professor corrige a própria aula até 24 h após finalizar, depois só a coordenação. Concorrência otimista pela versão da chamada.

**Motivo:** spec §11 pede confirmação ou bloqueio "conforme regra documentada"; bloquear impediria finalizar quando um aluno não compareceu e o professor não sabe o motivo. A janela de 24 h é a proposta inicial, pendente de validação com a escola (pergunta 2 da §26).

**Descartado:** reabrir a chamada para rascunho (apagaria o rastro do valor finalizado).

## 2026-10-29 — Driver, logger e fontes

**Decisão:** um driver só (`pg`) para Drizzle, Better Auth e pg-boss. Logger de servidor próprio em `src/lib/logger.ts` (JSON numa linha, só IDs e códigos), único ponto autorizado a usar `console` pela regra `quality/no-direct-console`. Fonte do sistema em vez de `next/font/google`.

**Motivo:** menos dependências; o pg-boss já exige `pg`. O logger atende à regra do toolkit sem biblioteca extra. Fonte do sistema evita requisição externa no build e no navegador.

**Descartado:** `postgres.js` (segundo driver); pino (sem necessidade no piloto); Geist via Google Fonts (padrão do `shadcn init`).

## 2026-10-29 — Perfil de ESLint do toolkit aplicado sem adaptação de conteúdo

**Decisão:** copiados da revisão `790a895` do Vibe Coding Toolkit: `next-app.config.mjs.example` → `eslint.config.mjs`, `eslint-rules/` inteiro, `verify.mjs` → `scripts/verify-quality-rules.mjs`, `next.typed.config.mjs.example` → `eslint.typed.config.mjs`. Ajustes: mensagens em pt-BR, `bindings: ["db", "pool"]`, `drizzleObjectName: ["db", "tx"]`, exceção de `no-direct-console` para o logger, e `drizzle/`, `test-results/` e `playwright-report/` ignorados em `eslint-rules/next-base.mjs`.

**Motivo:** `docs/quality.md` exige a mesma revisão do toolkit; o repositório estava acessível.

## 2026-10-29 — `next dev` não reescreve o AGENTS.md

**Decisão:** `agentRules: false` em `next.config.ts`; o aviso útil do bloco gerado (consultar `node_modules/next/dist/docs/`) foi incorporado à seção Stack do `AGENTS.md`.

**Motivo:** o `AGENTS.md` é curado e não deve receber blocos gerados que se repetem a cada `next dev`.

## 2026-10-29 — Seed demonstrativo recria o banco

**Decisão:** `pnpm db:seed` trunca as tabelas do schema `public` e recria os dados; recusa rodar com `NODE_ENV=production`, sem `DEMO_MODE=true` ou com `DATABASE_URL` fora de um Postgres local (liberação explícita: `SEED_ALLOW_REMOTE=true`). Senha comum das contas demo: `demo-aula-em-dia` (só desenvolvimento).

**Motivo:** seed reproduzível com datas relativas a hoje (spec §22) e contas demo nunca ativas em produção.

## 2026-10-29 — Limite de tentativas de login próprio

**Decisão:** a server action de login conta tentativas em `login_throttle` (Postgres, upsert atômico): 5 por e-mail e 30 por IP a cada 15 minutos. As chaves são hashes SHA-256; sucesso zera o contador do e-mail. O IP vem do primeiro valor de `x-forwarded-for`; sem proxy reverso confiável, vale só o limite por e-mail.

**Motivo:** a revisão de isolamento mostrou que o rate limit do Better Auth roda só no handler HTTP (`onRequest`), e o login usa `auth.api.signInEmail` direto na server action, sem esse handler.

**Descartado:** montar `/api/auth/*` e mover o login para o cliente (mais superfície exposta e repasse manual de cookies).

## 2026-10-29 — Renovação de sessão em GET

**Decisão:** aceitar que `auth.api.getSession` renove a expiração da sessão (a cada `updateAge` de 24 h) mesmo em requisições GET.

**Motivo:** é manutenção da sessão do Better Auth, não estado de domínio; a regra 7 trata de ciência e outras mudanças de negócio. Nenhum GET altera dados operacionais.

## 2026-10-29 — Logs sem mensagem de erro

**Decisão:** o logger registra de um erro só o nome e, se houver, `code` e `constraint` do Postgres. A mensagem nunca vai para o log.

**Motivo:** a mensagem de `DrizzleQueryError` inclui o SQL e os parâmetros (motivo de correção, nomes, hash de senha no seed), o que violaria a regra 11.

## Respostas da escola (spec §26)

| # | Pergunta | Resposta | Data | Quem respondeu |
|---|---|---|---|---|
| 1 | Plano Sponte e integrações autorizadas | | | |
| 2 | Quem lança presença; registro oficial | | | |
| 3 | Identificação de reposições nos dados externos | | | |
| 4 | Latência das mudanças | | | |
| 5 | Escrita de frequência ou agendamentos | | | |
| 6 | Funcionamento do Classplan | | | |
| 7 | Regras e saldo de reposição | | | |
| 8 | Aprovação de substituições e mudanças de turma | | | |
| 9 | Exigências da franquia | | | |
| 10 | Canal oficial de avisos e custos | | | |
