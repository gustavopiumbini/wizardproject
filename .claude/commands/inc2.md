---
description: Incremento 2 — agenda, conflitos, reposições e ciência versionada
---

# Incremento 2 — Agenda e reposições

Pré-requisito: o incremento 1 está concluído em `docs/status.md`. Leia as seções 8, 9, 10 e 13 de `docs/spec.md`. Comece em plan mode.

## Entregar

1. **Agenda:** visões de dia e semana com filtros por professor, sala, turma e tipo. Inclui RecurrenceSeries (alterar uma ocorrência sem alterar a série), CalendarException e TeacherAvailability.
2. **Conflitos no banco:** sobreposição de intervalos para professor, sala e aluno, mais capacidade, verificadas dentro de transação. Prefira restrição de exclusão (`tstzrange` + `btree_gist`) ou lock explícito, e documente a escolha em `docs/decisoes.md`.
3. **Reposições:** MakeupCase e MakeupBooking com as três dimensões separadas (agendamento, ciência e resultado). O aluno entra como participante de reposição sem mudar a turma regular. A falta de origem é preservada, e há bloqueio contra recuperação duplicada.
4. **Versionamento:** toda mudança material incrementa `version` na ocorrência. TeacherAcknowledgement fica ligado à versão, e a confirmação de ciência é feita por POST autenticado.
5. **Alteração e cancelamento:** troca de professor ou sala e cancelamento com histórico em AuditEvent.
6. **Classplan:** LessonPlan e LessonPlanVersion, com link ou anexo, e a ocorrência referenciando a versão usada.
7. **Telas:** Agenda, fila de Reposições com filtros e Hoje mostrando as ciências pendentes.

## Testes obrigatórios

Critérios 5, 6, 7, 10, 12 e 19. O teste 12 deve disparar reservas concorrentes de verdade.

## Ao terminar

Faça as mesmas verificações, rode o subagente `revisor-isolamento`, atualize os documentos e pare.
