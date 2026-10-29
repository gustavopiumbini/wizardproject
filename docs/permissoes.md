# Matriz de permissões

Fonte executável: `src/modules/tenancy/policy.ts` (`PERMISSIONS` e `can()`). Esta página e o código mudam juntos; o teste `src/modules/tenancy/policy.test.ts` cobre a matriz.

## Como a autorização funciona

1. `requireContext()` (`src/lib/context.ts`) lê a sessão do Better Auth e monta o contexto com `loadContext()`: usuário, organização, unidade, papéis na unidade e perfil docente ativo. A unidade ativa fica na sessão, no servidor, e é revalidada contra os vínculos a cada requisição. Com um único vínculo, ela é usada sem precisar escolher.
2. As consultas dos serviços sempre filtram por `organizationId` e `unitId` do contexto. Um ID de outra escola não encontra nada e responde "não encontrado", sem revelar se o registro existe.
3. `can(ctx, ação, recurso)` nega por padrão. O recurso precisa ser da mesma organização e unidade do contexto, e algum papel do usuário precisa conceder a ação no escopo certo.
4. O banco reforça o isolamento: as FKs entre tabelas operacionais são compostas por `(id, organization_id, unit_id)`, então nenhum registro liga entidades de escolas diferentes.

Esconder um botão na UI não é controle de acesso: toda server action chama `requireContext()` e o serviço chama `can()`.

## Papéis e vínculos

| Papel (`role`) | Nome na UI | Abrangência do vínculo |
|---|---|---|
| `org_manager` | Gestão | Organização inteira (`membership.unit_id` nulo) |
| `coordinator` | Coordenação | Uma unidade |
| `receptionist` | Recepção | Uma unidade |
| `teacher` | Professor | Uma unidade, com `teacher_profile` próprio da unidade |

O acúmulo de funções é explícito: uma linha de `membership` por papel e unidade. O professor de duas unidades tem dois vínculos e dois perfis docentes, e escolhe a unidade ao entrar. O papel "Dispositivo de TV" (spec §6) fica para o pós-MVP.

## Escopos

- **Unidade:** qualquer recurso da unidade do contexto.
- **Atribuída:** só aulas em que o perfil docente do usuário tem vínculo ativo (`teacher_assignment.status = 'active'`). Na substituição, o vínculo do titular é encerrado e o do substituto vale só para aquela ocorrência.
- **Atribuída na janela:** como "atribuída", e só até 24 h depois da finalização da chamada (`TEACHER_CORRECTION_WINDOW_MS`).

## Matriz

| Ação | Gestão | Coordenação | Recepção | Professor |
|---|---|---|---|---|
| `lesson.view` — ver ficha da aula e chamada | Unidade | Unidade | Unidade | Atribuída |
| `lesson.listOwn` — tela Hoje com as próprias aulas | — | — | — | Unidade (filtra pelo próprio perfil) |
| `attendance.record` — rascunho e finalização | — | — | — | Atribuída |
| `attendance.correct` — correção após finalizar | — | Unidade | — | Atribuída na janela |
| `attendance.overview` — visão de chamadas da unidade | Unidade | Unidade | Unidade | — |
| `class.transfer` — transferir aluno de turma | Unidade | Unidade | — | — |

"—" é negação. Ação nova começa negada para todos até entrar na matriz.

## Regras da chamada

- Aluno sem marcação é "não registrado". Nada presume presença nem falta.
- Rascunho e finalização: finalizar com alunos "não registrado" **exige confirmação explícita** (o servidor responde `pending_confirmation` com a quantidade, e a UI pede a confirmação). Eles continuam "não registrado" na chamada finalizada.
- Concorrência otimista: cada gravação informa a versão lida da chamada; versão diferente gera conflito explícito, sem sobrescrever.
- Depois de finalizada, a chamada não volta a rascunho. Toda mudança é correção, com motivo de pelo menos 5 caracteres, gravada em `attendance_revision` com autor, data e valores antes e depois. O professor corrige a própria aula até 24 h após a finalização; depois disso, só a coordenação.
- Aula cancelada não recebe chamada.
- Só é possível marcar participantes vigentes da ocorrência (o banco garante que o registro pertence a um participante daquela aula).
