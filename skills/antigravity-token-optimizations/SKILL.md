---
name: antigravity-token-optimizations
description: Directrices para depurar reglas redundantes en AGENTS.md, esquemas MCP no utilizados y filtrar archivos innecesarios para optimizar tokens.
---

# Antigravity Token Optimizations

Estrategias para minimizar el costo de tokens por turno:

1. **Reglas Esbeltas:** Mantener las reglas globales y de proyecto libres de prosa superflua o duplicada.
2. **Filtrado Preventivo (.gniignore):** Garantizar que artefactos pesados (`node_modules`, `build`, `.git`, `.venv`, cachés) sean ignorados por el agente.
3. **Auditoría MCP y Herramientas:** Evitar inyectar esquemas de herramientas de servidores MCP que no participen en el flujo activo.
4. **Auditoría de Contexto:** Utilizar `/context` para auditar el consumo por componente y descartar recursos de alto coste innecesarios.
