# Qualidade

**Estado:** sem código; nenhuma verificação executável ainda. Esta página fixa o que cada verificação deve provar e o que o `/inc1` precisa instalar.

## Comandos

| Comando | Prova | Disponível |
|---|---|---|
| `pnpm typecheck` | TypeScript strict sem erros | após `/inc1` |
| `pnpm lint` | ESLint (presets oficiais + regras do toolkit abaixo) | após `/inc1` |
| `pnpm test` | Vitest: unidade e integração com Postgres real via Docker | após `/inc1` |
| `pnpm test:e2e` | Playwright: fluxos ponta a ponta do incremento | após `/inc1` |
| `pnpm lint:typed` | Regras tipadas de promessas (`no-floating-promises`, `no-misused-promises`) | após `/inc1` |
| `pnpm lint:rules` | Self-check das regras locais de ESLint | após `/inc1` |

Verificação combinada antes de declarar pronto: `pnpm typecheck && pnpm lint && pnpm lint:typed && pnpm lint:rules && pnpm test`, mais os e2e do incremento. Rode testes focados durante o trabalho e a suíte completa no fim. Relate apenas o que rodou de fato.

## Regras de base (aplicar no `/inc1`)

Fonte versionada: Vibe Coding Toolkit, revisão `790a895304e0c08b70a5b215c9d334f1c86b816c` (`https://github.com/soumatheusgomes/vibe-coding-toolkit/tree/790a895304e0c08b70a5b215c9d334f1c86b816c`). Copie da mesma revisão, sem misturar versões:

- `templates/eslint/next-app.config.mjs.example` → `eslint.config.mjs` (perfil completo: presets Next/TypeScript, limite de 350 linhas por arquivo, sem `console` direto no servidor, sem acesso direto ao banco a partir de `src/app`/componentes, guardas do Drizzle para `update`/`delete` sem `where`). Ajuste caminhos (`@/db`, camadas) à estrutura real e escolha o logger de servidor do projeto, registrando a decisão em `docs/decisoes.md`.
- Diretório `templates/eslint/eslint-rules/` inteiro → `eslint-rules/`; `templates/eslint/verify.mjs` → `scripts/verify-quality-rules.mjs` (self-check das regras locais).
- `templates/eslint/next.typed.config.mjs.example` → `eslint.typed.config.mjs`: `no-floating-promises` e `no-misused-promises` como erro (projeto novo, sem legado). Meça tempo e memória no runner real.
- Scripts sugeridos pelo toolkit: `lint:typed`, `lint:rules`; incluí-los na verificação combinada e na lista de comandos do `AGENTS.md`.

Sem acesso ao repositório do toolkit, implemente o equivalente com recursos nativos (presets oficiais, `max-lines` 350, as duas regras tipadas e `no-console` no servidor), registre a limitação em `docs/decisoes.md` e siga. Essas regras não substituem `requireContext()`, `can()`, validação Zod nem revisão.

## Estratégia de testes

- Os critérios da spec §23 são os testes obrigatórios; cada incremento lista os seus.
- Isolamento multiescola sempre com tentativa de acesso cruzado usando IDs conhecidos de outra organização.
- Integração com Postgres real em Docker, banco descartável por execução; nunca dados reais.
- Concorrência (critério 12) com reservas simultâneas de verdade.
- Provedores externos simulados de forma explícita; nenhum envio real. Mock, SQL gerado e banco real são evidências diferentes.
- Não escreva testes que só repetem a implementação. Não declare cobertura que não foi medida.

Capacidades adotadas e quando provar cada uma:

- `next-dev-loop`: só depois de existir servidor Next.js; exige versão compatível, Turbopack e agent-browser (não instalado na nuvem).
- `next-bundle-optimizer`: auditoria com medições comparáveis; sem uso até haver build.
- `supabase-postgres-best-practices`: revisão de esquema, índices e migrações geradas antes de aplicar.
- `shadcn`: inspecionar `components.json` depois que existir.
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

Rode auditoria completa e de produção após instalar dependências; investigue avisos e registre riscos conhecidos. Lint e build passando não significam auditoria limpa. Sem hooks de Git, bloqueios de push ou exigência de branch. Atualize esta página junto com scripts e regras que mudarem.
