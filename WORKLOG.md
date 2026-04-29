# WORKLOG — CashFlow Spa

Bitácora de sesiones de trabajo. Cada sesión deja una entrada con:
- Cambios sin commitear (archivos + líneas afectadas)
- Decisiones tomadas y por qué
- Próximos pasos
- Bloqueos

**Patrón de uso:**
- Al **iniciar** sesión: pedir a Claude "lee WORKLOG.md y CLAUDE.md, ¿qué hay en progreso?"
- Al **cerrar** sesión: pedir "actualiza WORKLOG.md con lo de hoy y commitea"

---

## [2026-04-29] Pulido de carga (PR draft)

- **Estado:** Listo en rama `pulido-carga`, PR draft pendiente de revisión.
- **Cambios entregados:**
  - `useDelayedLoading(loading, 250)` en `db.jsx` — el spinner sólo aparece si la query tarda > 250 ms.
  - Listener `visibilitychange` en `db.jsx` — auto-reload si el tab estuvo en background > 5 min.
  - Botón ↻ "Recargar" en footer del sidebar (junto a logout). Ícono nuevo `refresh` en `primitives.jsx`.
  - `useDelayedLoading` aplicado en: `fn-dashboard`, `fn-turnos-list`, `fn-gastos-list`, `fn-objetivos`.
- **Decisiones:**
  - **No timeout en fetches** — sería invasivo (tocar cada query). El botón Recargar + auto-reload por visibilidad cubren el caso del "se quedó cargando" sin tocar lógica de cada pantalla.
  - **Fade transition diferido** — tocaba `pages-wrappers` o `AppShell` con keys o CSS por pantalla; riesgo de romper preservación de estado en sub-rutas (turnos→pv→arqueo). Se evalúa en siguiente iteración.
- **Próximo paso (siguiente sesión):**
  1. Observar en uso real si aún se siente lento.
  2. Si sí: implementar SWR (stale-while-revalidate) sólo para Turnos y Dashboard (cache `window.__cache[ruta]`, mostrar data vieja inmediato + refetch en background, invalidar al mutar).
  3. Considerar fade transition entre módulos (turnos↔gastos↔dashboard) usando key en AppShell.
- **Bloqueos:** Ninguno.

## [2026-04-29] Distinguir ejecutado vs vendido

- **Estado:** Mergeado en PR #71 (commit `d140c90` en main).
- **Decisiones clave:**
  - **Bono individual** (`calcBonoIndividual`) ahora se calcula sobre `vendedora_id` (lo que vendió cada terapeuta), no sobre `colaboradora_id` (lo que ejecutó). Fallback al ejecutor en ventas legacy sin vendedora_id.
  - **`comisiones` en bono** = `comision_mxn + comision_venta_mxn` (lo que paga el spa por esas ventas).
  - **Dashboard "Top colabs"** ahora muestra `Vendió $Y` junto a `Recibió $X`. `Recibió` ya incluía comisión ejecutada + comisión por venta + propina (no cambió).
  - **Recibo imprimible** no requirió cambios — ya sumaba ejecutada + venta + propinas en el bloque "Recibe".
- **Pendiente:** Pruebas operacionales con la encargada para validar que los nuevos números son correctos en escenarios reales (especialmente el bono individual con caso A vende, B ejecuta).

---

## Convención

- Las entradas más recientes van **arriba**.
- Cuando una entrada se mergea o cierra, dejamos el resumen pero quitamos el detalle de "cambios sin commitear" (ya están en git).
- Si un PR se cierra sin merge, anotar el motivo.
