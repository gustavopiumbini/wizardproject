# Design de interface

**Estado:** telas do incremento 1 implementadas (login, seleção de unidade, Hoje, detalhe da aula com chamada e visão de chamadas da coordenação). Direção extraída da spec §15 e §18.

## Direção

- Interface em pt-BR, com linguagem de escola. Navegação: Hoje, Agenda, Reposições, Alunos e, conforme o perfil, Coordenação e Administração.
- Visual sóbrio, denso na medida certa, sem excesso de cartões nem gráficos decorativos.
- Mobile-first para o professor: a tela Hoje precisa ser usável com uma mão.
- Modo demonstrativo sempre identificado pela faixa "Ambiente demonstrativo — sem conexão com Sponte"; integrações sem credencial aparecem como "não ativado".

## Sistema existente

- shadcn/ui 4.23 com estilo `base-nova` (primitivas Base UI), cor base `neutral`, variáveis CSS em `src/app/globals.css`, ícones lucide. Configuração em `components.json`; use a skill `shadcn` antes de alterar componentes.
- Componentes adotados em `src/components/ui/`: `button`, `input`, `label`, `badge`, `alert`. Os arquivos importam `cn` do pacote oficial `cn` (gerado pelo CLI); `src/lib/utils.ts` o reexporta.
- Fonte do sistema (sem Google Fonts). Faixa demonstrativa em âmbar no topo de todas as páginas (`src/components/demo-banner.tsx`), lida por requisição.
- Estado da chamada sempre em texto (`src/components/lesson-status.tsx`): "Chamada não iniciada", "Rascunho", "Finalizada", "Cancelada". Rótulos de frequência em `src/modules/attendance/labels.ts`.

## Padrões das telas

- **Hoje:** lista de aulas em blocos clicáveis, horário em destaque, "Próxima aula" marcada em texto, aviso quando o professor é substituto.
- **Chamada:** um `fieldset` por aluno com rádios nativos em botões de 44 px de altura (uso com uma mão), barra fixa no rodapé com "Salvar rascunho" e "Finalizar chamada", estado de gravação em `role="status"` ("Alterações não salvas", "Rascunho salvo (HH:MM)"). Finalizar com pendentes mostra a quantidade e pede confirmação marcada. O formulário usa `onSubmit` com `startTransition` porque o React 19 reseta formulários com `action` e as marcações sumiriam.
- **Correção:** aluno, novo registro e motivo obrigatório; histórico com valores antes → depois, autor, data e motivo.
- **Coordenação:** tabela por dia com navegação dia anterior/hoje/próximo, estado da chamada em texto e contagem por situação.
- Estados: `loading.tsx` ("Carregando…"), `error.tsx` com "Tentar novamente", `not-found.tsx` que não revela se o registro existe em outra escola, e rodapé "esta versão não funciona offline".

## Interação e estados

- Estados de carregamento, vazio, erro, sessão expirada, indisponível e desatualizado em todas as telas.
- A UI distingue salvo, aguardando sincronização, em conflito e não enviado; separa pendente de ciência, ciência confirmada e problema de entrega.
- Prévia e confirmação em ações destrutivas e importações. Sem suporte offline no MVP, e a UI diz isso.

## Acessibilidade

Status nunca só por cor; navegação por teclado; foco visível; contraste adequado; rótulos em todos os controles. Revise com a skill `web-design-guidelines`.

## Manutenção

Atualize ao adotar componentes, tokens ou padrões novos.
