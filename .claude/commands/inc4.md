---
description: Incremento 4 — importação revisada e adaptador Sponte (só contratos confirmados)
---

# Incremento 4 — Sponte e importação

Pré-requisito: o incremento 3 está concluído. Leia as seções 4 e 20 de `docs/spec.md` e as respostas registradas em `docs/decisoes.md` para as perguntas da §26.

## Antes de codar

Verifique em `docs/decisoes.md` quais operações do Sponte foram confirmadas pela escola. Se nenhuma foi, implemente só a importação por arquivo e diga isso explicitamente no plano. Nunca invente endpoints. A documentação pública pode ser consultada, mas não comprova acesso.

## Entregar

1. **Importação CSV:** ImportBatch com prévia, validação, mapeamento de colunas, ExternalMapping (único por origem e unidade), relatório de erros e commit explícito. Reimportar não duplica nada.
2. **Matriz de autoridade por campo** em `docs/autoridade-dados.md`, aplicada no código.
3. **Adaptador Sponte:** interface com IntegrationConnection, SyncRun e SyncIssue. Implemente somente os métodos confirmados; os demais lançam erro de "não suportado" com mensagem clara.
4. **Na UI:** origem, última atualização, aviso de dado desatualizado e pendências de sincronização.
5. Conflitos importados viram SyncIssue, nunca dados descartados.

## Testes obrigatórios

Critério 14, com teste de falha parcial e de ausência num lote (que não pode virar exclusão).

## Ao terminar

Faça as mesmas verificações, rode o `revisor-isolamento` e documente em `docs/status.md` o que depende de credenciais.
