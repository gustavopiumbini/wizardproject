# Aula em Dia

SaaS multiescola para coordenar aulas, professores, chamadas, faltas e reposições em escolas de idiomas e cursos livres. O nome é provisório. Não há vínculo oficial com Wizard, Pearson ou Sponte.

- Especificação completa do produto: `docs/spec.md`. Leia a seção relevante antes de implementar ou alterar um módulo.
- Decisões técnicas: registre em `docs/decisoes.md` (data, decisão, motivo, alternativas descartadas).
- Situação real das funcionalidades: `docs/status.md`, dividido em implementado, demonstrativo, dependente de credenciais e planejado.
- Os incrementos de trabalho estão nos comandos `/inc1` a `/inc5`. Não pule incrementos.

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

Antes de instalar qualquer pacote, confirme a versão estável atual e a compatibilidade na documentação oficial. Não invente APIs de bibliotecas.

## Comandos

Mantenha esta lista correta sempre que um script mudar.

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

## Estrutura

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

- Em tarefas não triviais, comece em plan mode e apresente um plano curto antes de editar.
- Leia a estrutura existente antes de mudar qualquer coisa e preserve o trabalho já feito.
- Faça commits pequenos por unidade lógica, com mensagens em português.
- Antes de declarar algo pronto, rode `pnpm typecheck && pnpm lint && pnpm test` e os e2e do incremento. Relate o que rodou de fato e o resultado; não diga que passou sem ter executado.
- Ao mexer em `policy.ts`, consultas multiescola, exportações ou jobs, rode o subagente `revisor-isolamento`.
- Pergunte só o que realmente bloqueia. Se uma dependência externa bloquear parte do fluxo, conclua o restante e documente o bloqueio em `docs/status.md`.
- Não faça envios reais, deploy, ações com custo nem importação de dados reais sem autorização explícita na conversa.
- Ao final de cada incremento, atualize `docs/status.md` e a lista de comandos acima.

## Idioma

A UI e a documentação são em português brasileiro. Identificadores de código ficam em inglês; comentários, em português.
