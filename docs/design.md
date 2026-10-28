# Design de interface

**Estado:** nenhuma tela implementada. Direção extraída da spec §15 e §18; o catálogo de componentes será registrado quando o shadcn/ui for adotado no `/inc1`.

## Direção

- Interface em pt-BR, com linguagem de escola. Navegação: Hoje, Agenda, Reposições, Alunos e, conforme o perfil, Coordenação e Administração.
- Visual sóbrio, denso na medida certa, sem excesso de cartões nem gráficos decorativos.
- Mobile-first para o professor: a tela Hoje precisa ser usável com uma mão.
- Modo demonstrativo sempre identificado pela faixa "Ambiente demonstrativo — sem conexão com Sponte"; integrações sem credencial aparecem como "não ativado".

## Sistema existente

Nenhum ainda. Stack prevista: Tailwind + shadcn/ui. Use a skill `shadcn` para inspecionar a configuração antes de alterar componentes e preserve customizações.

## Interação e estados

- Estados de carregamento, vazio, erro, sessão expirada, indisponível e desatualizado em todas as telas.
- A UI distingue salvo, aguardando sincronização, em conflito e não enviado; separa pendente de ciência, ciência confirmada e problema de entrega.
- Prévia e confirmação em ações destrutivas e importações. Sem suporte offline no MVP, e a UI diz isso.

## Acessibilidade

Status nunca só por cor; navegação por teclado; foco visível; contraste adequado; rótulos em todos os controles. Revise com a skill `web-design-guidelines`.

## Manutenção

Atualize ao adotar componentes, tokens ou padrões novos.
