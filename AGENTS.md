# Aula em Dia

SaaS multiescola para coordenar aulas, professores, chamadas, faltas e reposições em escolas de idiomas e cursos livres. O nome é provisório. Não há vínculo oficial com Wizard, Pearson ou Sponte.

Este arquivo vale para qualquer agente. Instruções exclusivas do Claude Code ficam em `CLAUDE.md`.

## Mapa de documentos

| Documento | Responsabilidade |
|---|---|
| `PRODUCT.md` | Resumo do produto e índice da especificação |
| `docs/spec.md` | Especificação completa (fonte de verdade do produto). Leia a seção relevante antes de implementar ou alterar um módulo |
| `docs/status.md` | Situação real: implementado, demonstrativo, dependente de credenciais e planejado |
| `docs/decisoes.md` | Decisões técnicas (data, decisão, motivo, alternativas descartadas) e respostas da escola (§26) |
| `docs/architecture.md` | Estrutura de código, fronteiras e dados (o que existe e o que é plano) |
| `docs/design.md` | Direção de interface e acessibilidade |
| `docs/onboarding.md` | Preparação local e primeiro fluxo |
| `docs/quality.md` | Verificações, testes, revisão e segurança |
| `docs/setup.md` | Evidências do setup do toolkit, ferramentas e pendências |
| `.claude/commands/inc1.md` … `inc5.md` | Escopo de cada incremento. Não pule incrementos |

Atualize o documento responsável na mesma mudança que altera comportamento, comando, esquema, fronteira ou configuração. Não duplique regras entre arquivos.

## Stack (fixa; não reavalie sem pedido explícito)

- Next.js (App Router) + TypeScript em modo `strict`
- PostgreSQL + Drizzle ORM, com migrações versionadas no repositório
- Better Auth, com sessões no banco
- Zod em toda fronteira: server actions, route handlers, importações e payloads de jobs
- pg-boss para fila, outbox e agendamento, num worker separado do app
- Tailwind + shadcn/ui
- Vitest para testes unitários e de integração com Postgres real (via Docker) e Playwright para e2e
- Mailpit para capturar e-mails em desenvolvimento
- pnpm e Docker Compose (Postgres + Mailpit)

Antes de instalar qualquer pacote, confirme a versão estável atual e a compatibilidade na documentação oficial (Context7 ou fonte oficial). Não invente APIs de bibliotecas.

## Comandos

Mantenha esta lista correta sempre que um script mudar. Estado atual: **nenhum script existe ainda**; todos são criados pelo `/inc1`. Até lá, não há lint, tipos, testes nem build para rodar.

```
docker compose up -d     # Postgres + Mailpit
pnpm dev                 # app
pnpm worker              # fila, outbox e lembretes
pnpm db:migrate
pnpm db:seed             # dados fictícios com datas relativas a hoje
pnpm typecheck
pnpm lint
pnpm test                # Vitest (unit + integração com banco)
pnpm test:e2e            # Playwright
```

Verificação combinada antes de declarar algo pronto: `pnpm typecheck && pnpm lint && pnpm test`, mais os e2e do incremento. O `/inc1` acrescenta `pnpm lint:typed` e `pnpm lint:rules` (ver `docs/quality.md`); a partir daí eles fazem parte da verificação combinada.

## Estrutura planejada

As camadas por módulo abaixo são exigidas pelo kit (não são abstração opcional para a regra de menor mudança).

```
src/app/                    rotas e UI (pt-BR)
src/modules/<modulo>/       schema.ts, service.ts, policy.ts, actions.ts, *.test.ts
  modulos: identity, tenancy, academic, schedule, attendance, makeup,
           followup, materials, notifications, integration, audit
src/adapters/email|whatsapp|sponte/   isolados da lógica de negócio
src/worker/                 jobs e agendador
src/lib/context.ts          requireContext(): usuário, organização e unidade autenticados
docs/
```

## Regras invioláveis

1. **Isolamento entre escolas.** Todo acesso a dados operacionais começa por `requireContext()` e filtra por `organizationId`/`unitId` derivados da sessão. Nunca confie em IDs de organização, unidade ou registro vindos do cliente sem validar o vínculo. Isso vale também para buscas, exportações, downloads, jobs e notificações. Chaves estrangeiras não podem ligar entidades de escolas diferentes.
2. **Permissões no servidor, negação por padrão.** Verifique com `can(ctx, acao, recurso)`. Esconder um botão na UI não é controle de acesso. Professor substituto só recebe acesso às aulas da substituição, por período delimitado.
3. **Nada simulado parece real.** Provedor ou integração não configurado aparece na UI como "não ativado". O modo demonstrativo mostra a faixa "Ambiente demonstrativo — sem conexão com Sponte". Nunca invente endpoints, webhooks ou métodos de escrita do Sponte. Nunca use sessão pessoal de WhatsApp Web ou biblioteca não oficial.
4. **Frequência não registrada é o padrão.** Nunca presuma presença ou falta por omissão.
5. **O histórico não é reescrito.** Vínculos de aluno com turma têm data de início e de fim. Para transferir, encerre o vínculo; nunca apague aluno ou turma. Correções guardam autor, data, motivo e os valores antes e depois.
6. **A reposição tem três dimensões separadas:** agendamento, ciência docente e resultado. Agendar não é realizar. Ciência não é presença. Concluir a reposição não apaga a falta de origem.
7. **A ciência vale para uma versão específica.** Toda mudança material incrementa a versão do evento e exige nova ciência. Uma requisição GET nunca altera estado, porque leitores de e-mail visitam links.
8. **Envios passam pela outbox.** Cada envio tem chave de idempotência (evento, versão, destinatário, canal, tipo). Antes de enviar, o job confere a versão atual, cancelamentos e o vínculo do destinatário. Os estados são distintos: programado, processando, aceito pelo provedor, entregue (só quando comprovado), falhou, cancelado e resultado incerto.
9. **Conflitos de agenda.** Verifique sobreposição de intervalos, não só horário igual, dentro de transação com bloqueio ou restrição no banco, cobrindo professor, sala, aluno e capacidade.
10. **Tempo.** Armazene `timestamptz` em UTC. O fuso é configurado por unidade (padrão `America/Sao_Paulo`). Recorrência, exibição e lembretes usam o fuso da unidade.
11. **Segredos e dados pessoais.** Credenciais ficam só no servidor. Nada de segredo, contato ou conteúdo de aula em logs. CSV exportado deve ter proteção contra fórmulas. Colete o mínimo de dados, pois pode haver menores.
12. **Escopo.** Não construa financeiro, emissão fiscal, cobrança, folha de pagamento, editor completo de slides, app nativo nem IA. Isso não é um ERP.

## Como trabalhar

- Leia a estrutura existente, as instruções e o código relevante antes de mudar qualquer coisa; preserve o trabalho já feito. Separe observação, suposição, decisão e evidência.
- Em tarefas não triviais, apresente um plano curto antes de editar, com critérios de aceitação e os comandos que vão provar o resultado.
- Faça a menor mudança completa. Reutilize padrões e dependências existentes; não crie abstrações, opções ou funcionalidades não pedidas. Isso nunca autoriza cortar validação, segurança, acessibilidade ou requisito explícito.
- Teste comportamento relevante e falhas. Correção de bug pede reprodução e teste de regressão quando viável. Prefira invariantes verificáveis (restrições no banco, Zod, testes) a recomendações longas.
- Faça commits pequenos por unidade lógica, com mensagens em português.
- Antes de declarar algo pronto, rode a verificação combinada e os e2e do incremento. Relate o que rodou de fato e o resultado; não diga que passou sem ter executado.
- Ao mexer em `policy.ts`, consultas multiescola, exportações ou jobs, faça a revisão de isolamento descrita em `.claude/agents/revisor-isolamento.md`.
- Pergunte só o que realmente bloqueia. Se uma dependência externa bloquear parte do fluxo, conclua o restante e documente o bloqueio em `docs/status.md`.
- Não faça envios reais, deploy, ações com custo nem importação de dados reais sem autorização explícita na conversa. Ter uma ferramenta instalada não autoriza usá-la para publicar.
- Ao final de cada incremento, atualize `docs/status.md`, `docs/decisoes.md` e a lista de comandos acima.

## Continuidade

- Durante trabalho autorizado, responda perguntas de status e continue. Pare se o usuário pedir pausa, cancelar ou mudar o objetivo.
- Um bloqueio para só as tarefas que dependem dele. Não repita a mesma tentativa sem evidência nova.
- Trabalho que atravessa sessões mantém um handoff curto no plano ou tarefa ativa (objetivo, estado verificado, verificações, pendências, bloqueios, próxima ação). Ao retomar, confira arquivos, Git, verificações e processos reais antes de confiar no handoff.

## Ferramentas e estilo

- **Superpowers:** use as skills de processo proporcionais ao tamanho da tarefa (brainstorming, planos, TDD, debugging, revisão). Instruções explícitas e execução já autorizada têm precedência sobre aprovações repetidas.
- **Ponytail:** modo `full` para código; `stop ponytail` desliga. Menor solução completa, nunca à custa das regras invioláveis ou do escopo do incremento.
- **Caveman:** conversa concisa em pt-BR, mantendo clareza e explicações completas quando pedidas. Código, documentação e commits usam redação normal. `stop caveman` desliga.
- **Context7:** consulte documentação atual de bibliotecas, APIs e configuração. Resolva o identificador e consulte um conceito por vez. Nunca envie segredos ou código privado. Se indisponível, use a fonte oficial e registre a limitação.
- **RTK e Graphify:** não estão instalados no ambiente de nuvem (ver `docs/setup.md`). Se estiverem disponíveis, use comandos suportados pelo RTK sem duplicar hooks; use o grafo do Graphify só para perguntas estruturais e trate grafo desatualizado como tal.
- **Modelos:** preserve o cliente, o modelo principal e a autenticação autorizados. Não ative APIs pagas, proxies nem troca de provedor.

Verifique instalação e descoberta antes de depender de uma ferramenta.

## Skills locais

Instaladas em `.claude/skills/` com `skills-lock.json`. Instalar não executa nada; não force animações, cache, deploy ou mudanças de arquitetura só porque a skill existe.

- `vercel-react-best-practices`: ao escrever ou revisar React/Next.js, dados e desempenho.
- `vercel-composition-patterns`: decisões de composição e API de componentes.
- `web-design-guidelines`: revisão de interface e acessibilidade.
- `writing-guidelines`: revisão de documentação e textos.
- `shadcn`: inspecione a configuração adotada, tokens e componentes antes de alterá-los.
- `supabase-postgres-best-practices`: antes de esquema, SQL, migração, segurança ou desempenho de PostgreSQL. Preserve Postgres + Drizzle; não adote Supabase.
- `differential-review`: revisão de diffs sensíveis a segurança (tenancy, permissões, jobs, exportações).
- `next-dev-loop`: feedback de runtime e navegador após mudanças em Next.js, depois de conferir versão, Turbopack, agent-browser e servidor em execução.
- `next-bundle-optimizer`: auditoria de bundle baseada em evidência, só com tarefa relevante.
- `find-skills`: descoberta quando faltar uma capacidade concreta.
- `vercel-react-view-transitions`, `vercel-optimize`, `deploy-to-vercel`, `vercel-cli-with-tokens`: só com tarefa pedida. Deploy e operações na Vercel exigem autorização explícita.

## Git, delegação e revisão

- Não adicione bloqueios de push, exigência de branch/worktree nem hooks `pre-commit`/`pre-push`. Verificações são comandos explícitos.
- Delegue só quando isolamento de contexto, especialização ou paralelismo independente justificarem. Prefira o modelo mais leve capaz de cumprir os critérios para buscas e tarefas mecânicas; use capacidade maior para segurança, tenancy, concorrência, migrações e revisão crítica.
- Cada tarefa delegada recebe objetivo, contexto mínimo, arquivos permitidos, critérios de aceitação e verificações. Um escritor por arquivo; o coordenador cuida de lockfiles, configuração compartilhada e Git. Revisores são somente leitura.
- Confira o diff e as verificações antes de aceitar o resultado de um subagente.
- Revise por risco e pelo diff real. Mudanças não triviais recebem revisão independente quando disponível. Termine quando os achados relevantes estiverem resolvidos ou justificados e as verificações afetadas passarem. Uma contagem de revisões não prova correção.

## Idioma

A UI e a documentação são em português brasileiro. Identificadores de código ficam em inglês; comentários, em português.
