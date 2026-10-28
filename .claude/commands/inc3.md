---
description: Incremento 3 — faltas, contatos, pendências, outbox e notificações
---

# Incremento 3 — Acompanhamento e comunicação

Pré-requisito: o incremento 2 está concluído. Leia as seções 12, 14 e 15 (Coordenação e Notificações) de `docs/spec.md`. Comece em plan mode.

## Entregar

1. **Faltas:** AbsenceFollowUp gerado a partir da falta finalizada e ContactAttempt com canal, responsável e data. Estados: sem contato, contato tentado, aguardando retorno e encerrado com motivo.
2. **Painel da coordenação:** chamadas pendentes, conflitos, ciências pendentes, faltas sem acompanhamento e envios com falha.
3. **Outbox e worker:** pg-boss em `pnpm worker`, chave de idempotência (evento, versão, destinatário, canal, tipo), retentativas limitadas com backoff e revalidação de versão, cancelamento e vínculo antes de enviar. Inclui todos os estados de entrega da regra 8 do `AGENTS.md`.
4. **Central interna** de notificações, com link para a situação atual da aula.
5. **Adaptador de e-mail** com interface própria, Mailpit em desenvolvimento e o status "não ativado" quando não houver provedor.
6. **Adaptador de WhatsApp:** somente a interface e o estado "não ativado". Não implemente provedor nenhum sem pedido explícito.
7. **Lembretes e escalada** de ciência pendente, configuráveis por unidade e com limite.

## Testes obrigatórios

Critérios 8, 9, 11 e 15. Simule o provedor de forma explícita; nenhum envio real.

## Ao terminar

Faça as mesmas verificações, rode o subagente `revisor-isolamento` (os jobs também precisam respeitar a tenancy), atualize os documentos e pare.
