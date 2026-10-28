---
description: Incremento 5 — exportações, backup, guias e preparação para o piloto
---

# Incremento 5 — Piloto e entrega

Pré-requisito: o incremento 4 está concluído. Leia as seções 11 (ficha individual), 18, 21 e 24 de `docs/spec.md`.

## Entregar

1. **Exportações:** CSV com proteção contra fórmulas, respeitando escola, permissões e filtros, e ficha individual em formato de impressão ou PDF sem observações internas.
2. **Refinamento mobile e acessibilidade:** teclado, foco, contraste, status nunca só por cor e todos os estados de tela.
3. **Observabilidade:** logs estruturados sem dados sensíveis e saúde do worker visível para a administração.
4. **Instrumentação das métricas do piloto** (§24).
5. **Documentação:**
   - `docs/backup-restauracao.md`, com restauração testada num banco isolado local;
   - `docs/guia-professor.md`, `docs/guia-recepcao.md` e `docs/guia-coordenacao.md`;
   - `docs/checklist-producao.md`;
   - diagrama de entidades em Mermaid.
6. **Relatório de testes** em `docs/status.md`, com o que rodou, o resultado e as pendências.

## Testes obrigatórios

Critérios 17 e 20, além da suíte completa.

## Limites

Nada de deploy, dados reais ou envios reais sem autorização explícita na conversa.
