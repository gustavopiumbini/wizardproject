# Setup e evidências

Registro do setup do Vibe Coding Toolkit neste repositório. Estados: **validado** (executado e observado), **configurado sem execução**, **reutilizado**, **não se aplica**, **bloqueado** (com condição para retomar).

## Origem e contexto

- Data: 2026-10-28.
- Toolkit: `https://github.com/soumatheusgomes/vibe-coding-toolkit`, revisão `790a895304e0c08b70a5b215c9d334f1c86b816c` (2026-10-18), prompt 12 (setup de projeto existente). Todos os guias e modelos vieram desta revisão.
- Produto: kit "Aula em Dia" (`CLAUDE.md`, `docs/spec.md`, `docs/decisoes.md`, `docs/status.md`, `/inc1`–`/inc5`, `revisor-isolamento`), copiado sem alterações no commit `695007d` antes de qualquer adaptação.
- Estado do repositório antes do setup: só `README.md`; nenhum código, script, teste ou CI. Não houve linha de base de lint, tipos, testes ou build para medir.
- Cliente: Claude Code 2.1.312 em container de nuvem efêmero (Linux). Runtime disponível: Node 22.22.0, pnpm 10.28.0, Docker 29.9.2, psql 16.15, Python 3.13.17, uv 0.11.32, gh 2.89.0.
- Delegação: subagentes usados para leitura do catálogo e para os casos do harness, com modelo mais leve (sonnet) por serem tarefas delimitadas e verificáveis; o coordenador conferiu todos os resultados. Custos e tokens não medidos.

## Decisões

| Decisão | Motivo |
|---|---|
| Kit na raiz, sem código de aplicação | Escolha do usuário. A fundação Next.js é escopo do `/inc1`; o prompt 12 proíbe scaffold sobre projeto existente |
| `AGENTS.md` como fonte das regras; `CLAUDE.md` = `@AGENTS.md` + específico do Claude | Padrão do toolkit. Verificado por script que nenhuma linha do `CLAUDE.md` original se perdeu (9 linhas reescritas com o mesmo conteúdo) |
| `docs/spec.md`, `docs/decisoes.md`, `docs/status.md` mantidos como canônicos | Evitar fontes concorrentes; `PRODUCT.md` é resumo e índice da spec |
| Plugins no escopo do projeto (`.claude/settings.json`) | Escolha do usuário; instalação global se perde no container efêmero |
| Skills instaladas só para o Claude Code, em `.claude/skills/` | Codex não é usado. A CLI `skills` 1.7.4 grava cópias diretas (sem `.agents/` nem links), portáveis inclusive no Windows |
| ESLint e regras de qualidade adiados para o `/inc1` | Sem código para medir; perfil especificado em `docs/quality.md` |
| Sem hooks próprios, sem hooks de Git, sem CI | Nenhuma necessidade concreta; não há comandos para rodar em CI |

## Componentes

| Componente | Ação e motivo | Escopo | Estado e evidência |
|---|---|---|---|
| Superpowers 7.0.0 | Instalado (`claude plugin install --scope project`) | Projeto | **Validado**: `claude plugin list` = enabled; descoberto numa sessão nova (`claude -p`) |
| Ponytail 5.3.2 | Instalado; opções no padrão (registro local, sem webhook) | Projeto | **Validado**: enabled e descoberto |
| Caveman 4.0.1 | Instalado. Aviso da CLI sobre dependências não instaladas não afeta: o hook usa só módulos nativos do Node (executado com sucesso) | Projeto | **Validado**: enabled e descoberto |
| Context7 1.0.4 (plugin com MCP remoto) | Instalado; sem `.mcp.json` duplicado | Projeto | **Bloqueado**: `claude mcp list` = "Needs authentication"; consulta anônima real a `resolve-library-id` respondeu "Monthly quota exceeded" (IP compartilhado). Retomar: autenticar o servidor pelo `/mcp` numa sessão do Claude Code ou criar chave gratuita em context7.com e configurá-la fora do repositório. Até lá, documentação oficial |
| Subagentes | Política de delegação em `AGENTS.md` | Projeto | **Validado** nesta execução (3 casos paralelos com arquivos disjuntos) |
| Conjunto web da Vercel: `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `writing-guidelines`, `vercel-react-view-transitions`, `vercel-optimize`, `deploy-to-vercel`, `vercel-cli-with-tokens` | Instalado (`npx --yes skills@latest add vercel-labs/agent-skills ... --agent claude-code --yes`). Deploy e tokens: instalados, nunca executados sem autorização | Projeto | **Validado** (instalação + descoberta); nenhuma execução |
| `find-skills` | Instalado (`vercel-labs/skills`) | Projeto | Instalado e descoberto |
| `supabase-postgres-best-practices` | Instalado: PostgreSQL de qualquer provedor; não adota Supabase | Projeto | Instalado e descoberto; uso a partir do `/inc1` |
| `shadcn` | Instalado: stack prevê shadcn/ui | Projeto | Instalado e descoberto; `shadcn info` pendente até existir `components.json` |
| `differential-review` (Trail of Bits, ref `main`) | Instalado para diffs sensíveis | Projeto | Instalado e descoberto; sem diff de código para usar |
| `next-dev-loop`, `next-bundle-optimizer` (vercel/next.js, ref `canary`) | Instalados para quando houver app | Projeto | Instalados e descobertos; **não executados** (sem servidor Next.js; `next-dev-loop` também exige agent-browser) |
| ESLint + regras do toolkit + perfil tipado | Especificado em `docs/quality.md`; `/inc1` aplica | — | Pendente (sem código) |
| Graphify | `.graphifyignore` versionado; `graphify-out/` no `.gitignore` | Projeto | CLI **bloqueada** (global, ausente); grafo **não se aplica** agora (sem código) |
| RTK | Não instalado (global; exige alterar config do cliente) | Usuário | **Bloqueado**: só persiste via script de setup do ambiente de nuvem |
| agent-browser | Não instalado (global) | Usuário | **Bloqueado** como o RTK; necessário para `next-dev-loop` |
| Chrome DevTools MCP | Não instalado | — | Não se aplica agora (sem interface) |
| Memória | Memória nativa = `CLAUDE.md` → `AGENTS.md` + documentos versionados; sem sistema externo | Projeto | **Validado**: sessão nova recuperou a regra 4 e a origem correta |
| Obsidian | Não adotado | — | Não se aplica: sem necessidade nem destino autorizado |
| Hooks do cliente | Nenhum hook próprio do projeto. Os plugins trazem hooks próprios (ex.: Caveman em SessionStart/UserPromptSubmit) | — | Não se aplica (hooks próprios) |
| Anthropic Skills / plugins oficiais extras | Não instalados | — | Não se aplica: sem necessidade de artefatos de escritório ou ferramentas extras |
| aia-harness | Não instalado | — | Não se aplica: duplicaria o harness do kit (settings e hooks próprios) |
| Codex | Não usado | — | Não se aplica; `AGENTS.md` já serve a outros clientes |
| `gh-fix-ci` | Não instalado | — | Não se aplica: fluxo do Codex e não há GitHub Actions |
| Sentry MCP | Não configurado | — | Não se aplica: nenhuma organização/projeto Sentry escolhido |
| Harness2 | Adaptação nativa do método (prompt 15), sem CLI oficial | Projeto | **Validado**: casos iniciais abaixo; nenhuma falha observada, então nenhuma comparação de candidato |
| Revisão de segurança | Prompt 13 copiado em `docs/prompts/revisao-seguranca.md` | Projeto | Configurado; usado no caso 3 abaixo |

Comandos para instalar o que está bloqueado, a colocar no script de setup do ambiente de nuvem (fora do repositório; exigem sua autorização):

```
brew install rtk-ai/tap/rtk && rtk init --global     # RTK (ou release oficial sem Homebrew)
uv tool install graphifyy && graphify install        # Graphify
npm i -g agent-browser && agent-browser install      # agent-browser
```

## Documentação criada

`PRODUCT.md`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/design.md`, `docs/onboarding.md`, `docs/quality.md` e este arquivo, todos com conteúdo do projeto e sem placeholders. Mapeamento: spec → `docs/spec.md` (canônica); decisões → `docs/decisoes.md`; status → `docs/status.md`. Referências a `CLAUDE.md` em `docs/spec.md`, `inc1.md` e `inc3.md` passaram a apontar para `AGENTS.md`.

## Verificações

| Item | Estado | Evidência |
|---|---|---|
| Sintaxe de `.claude/settings.json` e `skills-lock.json` | Validado | `python3 -m json.tool` |
| Referências entre documentos | Validado | Script de caminhos: só faltam arquivos que os incrementos criam e código futuro |
| Descoberta numa sessão nova | Validado | `claude -p` na raiz (13 s): regra 4 vinda de `AGENTS.md` via `@AGENTS.md`; "nenhum comando pnpm existe"; 4 plugins, 14 skills, `/inc1`–`/inc5` e `revisor-isolamento` listados; Context7 sem autenticação |
| Reaplicação sem duplicar | Validado | Repetir `marketplace add`, `plugin install` e `skills add`: hashes de `settings.json` e `skills-lock.json` iguais, árvore limpa |
| Lint, tipos, testes, build, auditoria | Não se aplica | Sem código nem dependências |

Recursos temporários: cópia do toolkit e fixtures em diretório de rascunho da sessão, fora do repositório.

## Memória e harness

- Memória: `CLAUDE.md` (carregado automaticamente pelo Claude Code) importa `AGENTS.md`; detalhes sob demanda nos documentos do mapa. Proveniência: cada fato durável vive no documento responsável; invalidar quando código, comandos ou decisões mudarem. Recuperação em contexto limpo verificada (acima). Handoffs temporários ficam no plano/tarefa ativa.
- Casos do prompt 14 (fixture `templates/harness-evaluation/` em cópias descartáveis; avaliador `scripts/validate-harness.mjs` fora do escopo gravável). Linha de base confirmada: 5/7, falhando "cross tenants" e "identidades inválidas". Executados por subagentes novos (contexto limpo, **não** reinício do cliente), modelo sonnet, cada um lendo o `AGENTS.md` do projeto:

| Caso | Resultado | Evidência independente |
|---|---|---|
| Correção de fronteira | Passou (~18 s) | Avaliador rerodado pelo coordenador: 7/7; diff só em `access.mjs`; notas e instruções com hash inalterado |
| Handoff desatualizado | Passou (~17 s) | Agente rodou o avaliador antes de confiar no "DONE", achou 5/7, corrigiu, reescreveu o handoff com evidência real; 7/7 rerodado |
| Revisão somente leitura | Passou (~24 s) | Hashes do fixture inalterados; relatório só no caminho privado (diretório 700), com leitura entre tenants, exemplo de ator/registro, local, impacto, severidade, confiança e limitações |

Não executados: reaplicação em projeto representativo com cliente reiniciado, conflito de recursos, bloqueio parcial e pausa/retomada (exigem interação observável do host). Um caso aprovado é smoke, não garantia de confiabilidade.

## Pendências e próxima entrega

1. **Risco aceito — plugins de terceiros:** os quatro plugins vêm de marketplaces no GitHub sem versão fixada (Ponytail e Caveman de contas pessoais) e executam hooks próprios fora do repositório. A verificação de reaplicação cobre só os arquivos do repositório. Ao atualizar plugins, revise as mudanças de hooks; para remover um, apague a entrada em `.claude/settings.json`.
1. **Push em 2026-10-28:** recusado pelo GitHub (403, o app Claude sem acesso ao repositório); atualize este item quando o push ocorrer.
2. Autenticar o Context7.
3. Decidir se RTK, Graphify e agent-browser entram no script de setup do ambiente.
4. Respostas da escola (spec §26) em `docs/decisoes.md` antes do `/inc4`.
5. Próxima entrega: `/inc1`, aplicando o perfil de ESLint de `docs/quality.md`.

Repetir este setup: rode de novo o prompt 12 do toolkit; ele deve detectar o que já existe e não duplicar plugins, skills ou seções. Atualizar skills: `npx --yes skills@latest update --project --yes` e revisar o diff de `skills-lock.json`. Reavaliar o harness após mudar instruções, skills ou plugins (`docs/quality.md`).
