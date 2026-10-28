# Especificação do produto — Aula em Dia

Este documento é a referência de produto. As regras de engenharia permanentes estão no `AGENTS.md` (com complementos do Claude Code em `CLAUDE.md`), e o escopo de cada etapa está nos comandos `/inc1` a `/inc5`.

## 1. Contexto e problema

A primeira implantação será numa unidade de escola de idiomas. O sistema deve poder atender outras unidades e escolas independentes depois.

Situação relatada pela equipe:

- A escola usa o Sponte para registros acadêmicos e administrativos, e as reposições já são registradas lá.
- A recepção também registra as reposições numa planilha e avisa o professor pelo WhatsApp, junto com o Classplan correspondente.
- Os professores consultam fichas recebidas pelo WhatsApp, que ficam desatualizadas quando um aluno muda de turma ou de professor.
- Há fichas manuais de aula, presença e anotações.
- As faltas são informadas num grupo de WhatsApp, onde a informação se perde.
- A coordenação precisa consultar vários lugares para entender agenda, mudanças e pendências.
- Na chegada do aluno, a recepção às vezes precisa consultar o sistema e as fichas para descobrir professor, turma e sala.

**Objetivo:** cada informação operacional tem um registro principal definido, que gera as visões de que cada pessoa precisa.

O relato comprova a necessidade em uma unidade. Isso não é validação comercial na rede nem autorização do franqueador.

## 2. Resultado esperado por perfil

- **Recepção:** encontrar aluno, professor, turma e sala rapidamente; consultar reposições; acompanhar faltas; registrar contatos; ver conflitos e saber se o professor tomou ciência.
- **Coordenação:** agenda central, pendências, alterações e substituições, chamadas e reposições não concluídas, informações desatualizadas.
- **Professor:** tela "Hoje" com as aulas e a lista correta de alunos, acesso ao Classplan, registro de chamada e conteúdo, alterações com histórico.
- **Gestão:** usuários, configurações, indicadores operacionais, exportações, medição de economia de trabalho.

## 3. Escopo

**MVP:** autenticação e isolamento entre escolas; perfis e permissões; cadastros mínimos; agenda central e visão do professor; aulas com lista de participantes válida para a data; reposições vinculadas à origem; ciência do professor; ficha digital e chamada; painel de faltas e contatos; notificações internas reais, e-mail configurável e WhatsApp por adaptador condicionado à configuração oficial; histórico e controle de concorrência; integração com o Sponte por adaptador, com modo demonstrativo; exportação e documentação de recuperação.

**Etapa seguinte:** painel de TV; biblioteca de warm-ups, closings e atividades; indicadores de recorrência de faltas (sem rotular alunos automaticamente); experiência com conexão instável.

**Etapa posterior:** slides simples a partir de modelos; outros sistemas de gestão; portal do aluno ou responsável; faturamento do SaaS.

**Fora do escopo:** financeiro escolar, emissão fiscal, mensalidades, folha de pagamento, editor completo de apresentações, app nativo e IA.

## 4. Propriedade dos dados e Sponte

Nunca mantenha dois registros concorrentes da mesma informação sem uma regra de autoridade. Documente a origem principal por entidade e campo antes de implementar a sincronização.

| Informação | Origem principal proposta |
|---|---|
| Cadastro do aluno, matrícula e turma | Sponte, quando a integração existir |
| Reposição já registrada no sistema atual | Sponte |
| Ciência do professor | Aula em Dia |
| Notificações e pendências operacionais | Aula em Dia |
| Anotações internas e materiais próprios | Aula em Dia, conforme permissões |
| Presença oficial | Depende da validação da escrita no Sponte e da política da escola |
| Sala, horário e professor da aula | A validar |

**Condições:**

- Existe documentação pública de extração de dados do Sponte, mas isso não prova acesso contratado nem permissão de escrita.
- A API de BI traz frequência em snapshots semanais e não serve como presença em tempo real.
- Confirme autorização, autenticação, dados, granularidade, frequência, limites e custo antes de prometer sincronização. Confirme separadamente reposições, alterações, cancelamentos, vínculos e planejamento.
- Não use login pessoal compartilhado nem automação oculta de telas.
- As credenciais pertencem à escola ou unidade e ficam no servidor.

**Modos de operação:**

- **Demonstração:** dados 100% fictícios e a faixa "Ambiente demonstrativo — sem conexão com Sponte".
- **Importação autorizada:** CSV ou planilha exportada pela escola, com prévia, validação, mapeamento, ID externo e relatório de erros. Mostra a data da atualização e não promete atualização automática.
- **Integração de leitura:** importa os dados realmente disponíveis e mostra a última sincronização e o estado de desatualização. As reposições continuam sendo criadas na origem oficial.
- **Integração de escrita:** só para operações oficialmente confirmadas e testadas, com confirmação do resultado, idempotência e tratamento de falhas.
- **Modo local independente:** para escolas sem ERP, configurado explicitamente. Trocar de modo exige prévia dos conflitos; nunca substitui dados silenciosamente.

Se não houver escrita de presença, a chamada digital fica no demonstrativo ou como registro operacional explicitamente separado do diário oficial. Não declare que o lançamento duplicado foi eliminado enquanto ele existir.

## 5. Multiescola

- Organização, unidades e usuários com vínculos explícitos. Uma organização pode ter várias unidades, e um usuário pode participar de várias, com seleção clara de contexto.
- Professores de unidades diferentes não compartilham dados automaticamente.
- Consultas da recepção e da coordenação ficam limitadas às unidades autorizadas.
- O administrador da plataforma não tem acesso irrestrito aos dados das escolas. Acesso de suporte é explícito, temporário e auditado.
- A identidade visual é configurável, sem exigir a marca de franquia.

## 6. Perfis

| Perfil | Permissões iniciais |
|---|---|
| Gestor da organização | Unidades, usuários, integrações, configurações e relatórios |
| Coordenação | Agenda, professores, substituições, reposições e correções de frequência da unidade |
| Recepção | Consultar agenda e alunos, acompanhar faltas e contatos, operar agendamentos conforme a origem autorizada |
| Professor | Próprias aulas, alunos vinculados e materiais autorizados; chamada, conteúdo e ciência |
| Dispositivo de TV | Leitura de uma projeção pública mínima de uma unidade |

Acúmulo de funções deve ser explícito e visível. Notas sensíveis e contatos não aparecem para todos os perfis. Desencoraje o registro de informações médicas ou pessoais.

## 7. Cadastros

- **Aluno:** ID interno, ID externo opcional, nome, nome de exibição, situação e vínculos. Telefone e responsável só quando necessários e autorizados.
- **Professor:** usuário, unidades, situação, disponibilidade e restrições. IDs externos ficam separados dos internos.
- **Turma:** código, curso ou nível, unidade, professor responsável, sala usual, capacidade e recorrência. Alterar uma ocorrência não altera a série sem escolha explícita.
- **Vínculo com turma:** data de início e de fim. A lista de uma aula passada preserva quem participou ou deveria participar naquele momento.
- **Aula (ocorrência):** início, fim, fuso, sala, professor efetivo, turma, tipo e estado. Participantes regulares e de reposição ficam identificados separadamente. Tipos: regular, individual, reposição e experimental, habilitáveis por escola.

## 8. Agenda e conflitos

- Visões diária e semanal, com filtros por professor, sala, turma e tipo.
- Professor, sala e aluno não podem ter reservas sobrepostas. Aulas consecutivas são permitidas, com buffer configurável.
- Bloqueio de indisponibilidades, feriados e dias sem funcionamento.
- A capacidade conta alunos regulares e de reposição. Duas pessoas não podem reservar o último lugar ao mesmo tempo.
- Cancelar libera a reserva e preserva o histórico.
- Exceções permitidas à coordenação exigem motivo. Conflito físico de professor ou sala não pode ser liberado por um botão genérico.
- Alterações importadas com conflito viram pendência de revisão.
- Quando depende de importação, a agenda mostra a última atualização; dados antigos não aparecem como certeza.

## 9. Reposição

Fluxo:

1. Receber da fonte autorizada, ou criar localmente no modo habilitado.
2. Relacionar aluno, aula ou ausência de origem, conteúdo e motivo.
3. Verificar elegibilidade, prazo, capacidade e conflitos.
4. Incluir na aula de destino sem mudar a turma regular.
5. Dar visibilidade a recepção, coordenação e professor.
6. Solicitar ciência ao professor.
7. Programar os lembretes.
8. Registrar realizada, ausente ou cancelada.
9. Atualizar o acompanhamento da falta original sem apagá-la.

As três dimensões:

- **Agendamento:** pendente, agendada ou cancelada.
- **Ciência:** pendente, confirmada ou requer revisão.
- **Resultado:** não lançado, realizada ou aluno ausente.

Regras:

- Uma falta não vira reposição automaticamente. Uma falta pode ter várias tentativas e reagendamentos, mas não duas recuperações indevidas do mesmo direito.
- Expiração ou saldo de reposições só existe se a escola configurar.
- Se o professor não puder atender, abre-se pendência para a coordenação; nada é remanejado automaticamente.

## 10. Alterações, cancelamento e ciência

- Mudança material (data, horário, professor, sala ou conteúdo relevante) gera nova versão e exige nova ciência.
- Cancelar invalida lembretes futuros e gera aviso de cancelamento.
- Os links levam à situação atual, porque mensagens antigas não se atualizam.
- A UI separa pendente de ciência, ciência confirmada e problema de entrega.
- Há escalada configurável para a coordenação quando a ciência não ocorre, com limite.

## 11. Ficha, chamada e histórico

- **Ficha da aula:** data, horário, professor, turma, sala, alunos (reposições identificadas), Classplan, conteúdo previsto e ministrado, observações autorizadas.
- **Chamada:** estados não registrado (padrão), presente, ausente, atrasado e ausência justificada, conforme habilitação.
  - Há rascunho e finalização. Ao finalizar com itens pendentes, o sistema exige confirmação ou bloqueia, conforme regra documentada.
  - Após a janela de correção, alterar exige permissão e motivo, com auditoria de antes e depois.
  - Não é possível registrar para professor sem vínculo nem para aluno fora da ocorrência, salvo inclusão autorizada e auditada.
- **Ficha individual:** histórico cronológico de aulas, frequência, conteúdo, reposições, mudanças de turma e acompanhamento, com filtro por período. Exporta em PDF ou formato de impressão e em CSV. Observações internas nunca vão para documentos destinados ao aluno.

## 12. Faltas e contatos

- A falta registrada pelo professor entra direto na fila da recepção.
- Estados: sem contato, contato tentado, aguardando retorno e encerrado (com motivo).
- O registro de contato inclui canal, responsável e data. Preparar uma mensagem não conta como contato, e notificação enviada não encerra o acompanhamento.
- O sistema distingue ausência justificada de ausência com reposição pendente.
- A coordenação pode filtrar faltas recorrentes para avaliação humana.
- No MVP, nenhuma mensagem é enviada a alunos ou responsáveis por padrão.

## 13. Classplan

- O formato é desconhecido; não presuma plataforma nem API.
- No MVP, cada aula ou turma pode ter um link autorizado ou anexo próprio, com título, descrição, nível e versão. A aula guarda a versão usada.
- O conteúdo previsto fica separado do ministrado. A reposição pode referenciar o planejamento da aula original.
- Não copie material proprietário. A biblioteca de uma escola não é compartilhada entre clientes.

## 14. Notificações

**Eventos:** nova reposição, alteração ou cancelamento, pedido de ciência, lembrete de aula, chamada não finalizada, ciência pendente e falha de integração.

**Canais:**

1. Central interna persistida no banco.
2. E-mail com provedor configurável e domínio validado.
3. WhatsApp por integração oficial, com modelos, regras e custos verificados.

**Requisitos:**

- Outbox persistente; nada depende de aba aberta.
- Idempotência por evento, versão, destinatário, canal e tipo. Retentativas limitadas com backoff.
- Antes de enviar, conferir evento, cancelamento, vínculo e permissão.
- Horários de silêncio configuráveis e poucos lembretes no piloto.
- Webhooks são validados, com tratamento de repetição e fora de ordem.
- O botão de ciência abre uma área autenticada. Sem provedor configurado, a UI diz isso.

## 15. Telas

- **Hoje (professor):** próxima aula, agenda, alterações, ciências pendentes, reposições, Classplan e chamada. Usável com uma mão.
- **Agenda:** dia e semana, filtros, conflitos, detalhes, cancelamentos e dados desatualizados.
- **Detalhe da aula:** dados, participantes, chamada, planejamento, conteúdo e histórico.
- **Reposições:** fila e filtros por aluno, professor, período, agendamento, ciência e resultado, destacando aulas próximas sem ciência.
- **Aluno:** ficha, vínculos atuais e históricos, próximas aulas, frequência, reposições e acompanhamento.
- **Coordenação:** pendências acionáveis (chamadas, conflitos, ciências, faltas, integração, envios falhos), sem gráficos decorativos.
- **Administração:** usuários, perfis, unidades, salas, horários, regras, canais, integração, importações e auditoria.
- **Notificações:** histórico interno com link para a aula.

## 16. Painel de TV (pós-MVP)

- Mostra horário, turma, sala, professor e estado. Nunca alunos, contatos, presença ou observações.
- Usa credencial de dispositivo própria, revogável e restrita à unidade; nunca a conta da coordenação.
- Mostra a última atualização e um aviso de desatualizado ou sem conexão. Atualiza sozinho e exibe só uma janela configurada.

## 17. Biblioteca e slides (posterior)

- **Biblioteca:** warm-ups, closings, atividades e modelos próprios, com objetivo, idioma, nível, faixa etária, duração, materiais, instruções, autor e anexos. Busca, favoritos e fluxo rascunho → revisão → publicação, se necessário. Compartilhamento entre escolas só por ação explícita.
- **Slides:** templates fixos, prévia e apresentação no navegador. Exportação só depois de testada. Nada de editor completo no MVP; IA só opcional, com revisão humana e sem dados de alunos por padrão.

## 18. UX e acessibilidade

- Interface em pt-BR, com linguagem de escola. Navegação: Hoje, Agenda, Reposições, Alunos e, conforme o perfil, Coordenação e Administração.
- Visual sóbrio, denso na medida certa, sem excesso de cartões. Mobile-first para o professor.
- Estados de carregamento, vazio, erro, sessão expirada, indisponível e desatualizado.
- Status nunca só por cor. Teclado, foco visível, contraste e rótulos.
- Prévia e confirmação em ações destrutivas e importações.
- A UI distingue salvo, aguardando sincronização, em conflito e não enviado.
- Sem suporte offline no MVP, e a UI diz isso claramente.

## 19. Modelo de dados mínimo

Organization, SchoolUnit, User, Membership, Role/Permission · TeacherProfile, Student, Enrollment, ClassGroup, ClassMembership · Room, TeacherAvailability, CalendarException, RecurrenceSeries · LessonOccurrence, LessonParticipant, TeacherAssignment · AttendanceRecord, AttendanceRevision · MakeupCase, MakeupBooking, TeacherAcknowledgement · LessonPlan, LessonPlanVersion, LessonNote, Attachment · AbsenceFollowUp, ContactAttempt · Notification, OutboxJob, DeliveryAttempt, ProviderCallback · IntegrationConnection, ExternalMapping, SyncRun, SyncIssue, ImportBatch · AuditEvent, DisplayDevice.

Restrições obrigatórias:

- Frequência única por participante e ocorrência.
- Mapeamento externo único por origem e unidade.
- Ciência ligada à versão do evento.
- Papel docente separado do usuário.
- Nome nunca serve de identificador.

## 20. Importação e sincronização

- Prévia, validação e commit explícito. Reimportar não duplica nada.
- Sincronização incremental com cursor e registro de cada execução.
- Falha parcial não apaga registros. Ausência num lote não significa exclusão.
- Tratamento de paginação, limites, retentativas e credencial expirada.
- Divergências seguem a matriz de autoridade da seção 4.
- Aula encerrada não tem frequência nem conteúdo reescritos por mudança de cadastro.
- Edições simultâneas geram conflito explícito, nunca sobrescrita silenciosa.

## 21. Segurança e recuperação

- Autenticação real, recuperação de conta, sessões com expiração e revogação. Convites com validade.
- Proteção contra IDOR, injeção, CSRF e abuso de login. Uploads validados (tipo, tamanho, nome) e URLs privadas e temporárias.
- Auditoria com acesso restrito e retenção definida.
- Não anunciar conformidade legal automática. Retenção e responsabilidades são definidas com a escola.
- Backups com restauração documentada e testada em ambiente isolado. Metas de RPO e RTO são propostas, não declaradas como atendidas sem teste.
- A ficha impressa é contingência, não preenchimento duplicado permanente.

## 22. Dados de demonstração

- Seed reproduzível com 2 organizações isoladas, uma delas com 2 unidades. Nomes e contatos fictícios, sem marca oficial.
- Datas relativas ao dia da instalação, para que a tela Hoje sempre tenha conteúdo.
- Cenários obrigatórios: reposição pendente de ciência; reposição concluída; cancelamento; troca de professor; aluno transferido de turma; chamada não registrada; falta em acompanhamento; conflito de horário; falha de envio; integração desatualizada.
- Contas demo nunca ficam ativas em produção. Envios reais ficam bloqueados no seed e na demo.

## 23. Critérios de aceitação

1. Professor A não acessa aula do Professor B sem vínculo ou substituição autorizada.
2. Usuário de uma escola não acessa registros, buscas, arquivos, exportações ou notificações de outra, mesmo conhecendo os IDs.
3. O professor registra a chamada e a recepção vê o mesmo resultado.
4. Aluno sem marcação continua "não registrado".
5. A reposição aparece na aula de destino sem alterar a turma regular.
6. Presença na reposição não apaga a falta original nem permite duas recuperações do mesmo direito.
7. Ciência de versão anterior não vale após mudança material.
8. Cancelamento invalida o lembrete antigo, e retentativas não o recriam.
9. Job duplicado não gera aviso duplicado.
10. Link visitado por leitor de e-mail não confirma ciência.
11. Falha de envio aparece como falha ou incerto, nunca como entregue.
12. Reservas simultâneas não excedem a capacidade nem sobrepõem professor ou sala.
13. Transferência de turma preserva lista e frequência das aulas passadas.
14. Importação repetida não duplica; falha parcial não apaga registros válidos.
15. Sem credenciais externas, o app funciona em demo e mostra as integrações inativas.
16. A TV não acessa ficha, contatos nem lista nominal.
17. Exportação respeita filtros, escola, permissões e caracteres especiais.
18. Correção de frequência registra motivo, autor e valores anteriores.
19. Agenda, recorrência e lembretes respeitam o fuso da unidade.
20. Restauração de backup validada em ambiente isolado, ou registrada como pendência de produção.

## 24. Validação do piloto

Métricas, sem expor dados pessoais:

- tempo para consultar uma reposição e comunicar uma mudança;
- lançamentos duplicados restantes;
- reposições próximas sem ciência;
- chamadas pendentes após o horário;
- faltas sem acompanhamento;
- conflitos identificados e corrigidos;
- falhas e atrasos de sincronização e envio.

Compare com a linha de base da escola. Não invente ganhos.

## 25. Referências (verificar a versão vigente)

- Sponte Extrações: https://integracaopp.sponteweb.com.br/index.html
- Sponte BI: https://sponte-bi.sponteweb.com.br/docs/
- Portal do Professor Sponte: https://www.sponte.com.br/portal-do-professor
- Portal do Professor Wizard: https://franquias.wizard.com.br/portaldoprofessor
- Suporte Sponte: https://www.sponte.com.br/suporte

A existência dessas páginas não prova acesso nem viabilidade.

## 26. Perguntas abertas para a escola

Registre as respostas em `docs/decisoes.md`. Nenhuma delas bloqueia a demo.

1. Qual produto ou plano Sponte a unidade usa e quais integrações autoriza?
2. Quem lança a presença no Sponte e qual registro é o oficial?
3. Como identificar reposições e suas alterações por dados externos?
4. É possível receber mudanças com latência adequada?
5. É possível escrever frequência ou agendamentos?
6. Como funciona o Classplan?
7. Que regras geram direito a reposição, e como o saldo é controlado?
8. Quem aprova substituições e mudanças de turma?
9. Há exigências da franquia para sistemas e materiais?
10. Qual canal oficial enviará os avisos, e quem paga e opera?
