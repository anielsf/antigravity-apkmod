---
name: antigravity-context-optimization
description: Estrategias avanzadas de optimización de contexto, compactación, observation masking y partición de memoria para reducir drásticamente el consumo de tokens en Antigravity.
---

# Antigravity Context Optimization

Aplica las siguientes técnicas para preservar la ventana de contexto y acelerar las respuestas:

1. **Compaction:** Resumir el estado actual y descartar turnos o historiales superados cuando el contexto sea extenso.
2. **Observation Masking:** Reemplazar salidas extensas de comandos terminales, logs repetitivos o volcados de datos por resúmenes concisos con referencias de archivo o IDs de error.
3. **KV-Cache Optimization:** Mantener consistentes los prefijos del sistema y estructurar las peticiones para maximizar el reúso de caché de atención.
4. **Partición de Contexto:** Consultar e incorporar exclusivamente los fragmentos o archivos indispensables para el turno de trabajo inmediato.
