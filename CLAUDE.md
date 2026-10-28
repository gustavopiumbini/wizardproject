@AGENTS.md

## Específico do Claude Code

- Em tarefas não triviais, comece em plan mode e apresente um plano curto antes de editar.
- Os incrementos de trabalho estão nos comandos `/inc1` a `/inc5` (`.claude/commands/`). Não pule incrementos.
- Ao mexer em `policy.ts`, consultas multiescola, exportações ou jobs, e antes de concluir cada incremento, rode o subagente `revisor-isolamento` (`.claude/agents/revisor-isolamento.md`).
- Plugins do projeto (Superpowers, Context7, Ponytail, Caveman) e marketplaces estão declarados em `.claude/settings.json`; skills locais, em `.claude/skills/`. Detalhes e estado em `docs/setup.md`.
