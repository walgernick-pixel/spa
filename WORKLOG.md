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

## [2026-04-29] Login offline con credenciales hasheadas (en progreso, PR pendiente)

- **Estado:** Implementado en rama `login-offline`. PR pendiente de abrir/mergear.
- **Cambios:**
  - `fn-auth.jsx`: nuevos helpers `cacheAuthOffline` / `verifyOfflineAuth` / `loginWithFallback` con PBKDF2-SHA256 (Web Crypto API).
  - Tras login online exitoso → cachea `{username, perfil, rolData, salt, hash, cachedAt}` en IDB con TTL 14 días.
  - Login offline: valida password contra hash local. Si match → setea `window.__auth.perfil` directamente.
  - `logout`: ahora confirma con `window.confirm`, con warning extra si offline ("no podrás reentrar offline si cierras sesión").
  - `offline.jsx`: expone `idbPut` e `idbGet` al `window` (los necesita fn-auth).
- **Decisiones:**
  - **PBKDF2 100k iteraciones, SHA-256**: estándar industrial, lento contra brute force.
  - **TTL 14 días**: si la encargada no ha entrado online en 2 semanas, fuerza re-login.
  - **No auto-restore al abrir**: el usuario siempre teclea password (incluso offline). El cache solo verifica, no auto-loguea sin contraseña.
  - **Si server dice "credentials inválidas" online → NO intenta offline**. Evita confusión cuando la contraseña realmente está mal.
- **Acción pendiente del owner:**
  - En Supabase Dashboard → Auth → Settings → JWT expiry: cambiar de 3600s (1h) a 604800s (7 días). Esto extiende la duración del access token para que la sesión real persista más sin necesidad de refresh.
- **Próximo paso:** Probar en preview y mergear.

---

## [2026-04-29] UX-pulido (PR #72)

- **Estado:** En rama `pulido-carga`, PR #72. Listo para merge.
- **Cambios entregados:**
  - `useDelayedLoading(loading, 250)` en `db.jsx` — el spinner sólo aparece si la query tarda > 250 ms.
  - Listener `visibilitychange` en `db.jsx` — auto-reload si el tab estuvo en background > 5 min.
  - Botón ↻ "Recargar" en footer del sidebar (junto a logout). Confirma antes si hay capturas pendientes en cola.
  - Ícono `refresh` en `primitives.jsx`.
  - `useDelayedLoading` aplicado en: `fn-dashboard`, `fn-turnos-list`, `fn-gastos-list`, `fn-objetivos`.
  - **Sidebar colapsable** — toggle manual + auto-colapso si viewport < 1100px. Modo colapsado: sólo iconos, ~60px. Preferencia persiste en `localStorage`.
  - WORKLOG.md + sección "Para Claude" en CLAUDE.md.
- **Decisiones:**
  - **Confirm en refresh sólo si hay queue** — no estorba en uso normal, protege contra clicks accidentales en pleno trabajo.
  - **Sidebar default según viewport** si el usuario nunca eligió. Si ya eligió, su preferencia gana.
  - **Fade transition diferido** — riesgo de romper preservación de estado en sub-rutas. Próxima iteración.
- **Próximo paso:**
  1. Probar en uso real con la encargada (tablet).
  2. Si aún se siente lento en alguna pantalla: SWR (stale-while-revalidate) sólo para Turnos y Dashboard.
  3. Lock de 1 perfil por turno con admin override (Fase 2 que dejamos pendiente).
- **Bloqueos:** Ninguno.

## [2026-04-29] Offline completo (PR #73 — mergeado)

- **Estado:** Mergeado a main (commit `719de17`).
- **Decisiones clave:**
  - Snapshot del turno (turno + ventas + venta_pagos + turno_colaboradoras + arqueos) en IDB. Lectura cuando offline.
  - Helpers nuevos en `offline.jsx`: `sbDelete`, `sbUpsert`, `snapshotTurno`, `leerSnapshotTurno`, `cacheTurnosList`, `leerTurnosListCache`.
  - Optimistic update + persist al snapshot tras togglePago/guardarFirma/borrarVenta para que UI offline se sienta en tiempo real Y arqueo lea estado fresco.
  - Migración 27: unique partial index `turnos(estado) where estado='abierto'`.
  - Ref-lock síncrono en abrirTurno previene race condition de clicks rápidos.
- **Pendiente:** Pruebas reales con la encargada offline.

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
