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

## [2026-06-03] Dashboard · flujo de caja por cuenta con pagos multi-moneda

- **Estado:** Branch `claude/vibrant-galileo-AHxEG`. Solo cambio de código (sin migración, sin tocar datos).
- **Bug reportado (dueño):** En un rango personalizado (11–31 may), el KPI "Neto al spa" (44,075) no cuadra con la suma del "Flujo de caja por cuenta", y la cuenta de DÓLARES marcaba muchos más USD de los que hay físicamente.
- **Diagnóstico (verificado en Supabase):**
  - El KPI está en **MXN equivalente** y excluye propinas → es correcto.
  - El flujo por cuenta está en **moneda nativa** de cada cuenta y antes restaba propinas → por diseño no cuadra con el KPI cuando hay cuentas USD.
  - **Bug real:** el flujo calculaba ingresos volcando todo `venta.precio` sobre `venta.cuenta_id`, **ignorando los pagos partidos** (`venta_pagos`). 6/139 ventas del periodo tienen pago partido en varias cuentas/monedas (p.ej. 20 USD + 200 MXN). Resultado: la cuenta USD mostraba 4,425 cuando el inflo real fue 2,439 USD (≈1,986 USD inflados). Además, comisiones en pesos de esas ventas se restaban como dólares.
- **Fix (`app-preview/src/fn-dashboard.jsx`):**
  - Se cargan `venta_pagos` del periodo (fetch chunked por 200 ids).
  - Ingresos por cuenta ahora salen de `venta_pagos(servicio)` en moneda nativa (fallback a `precio`/`cuenta_id` para ventas legacy sin pagos).
  - Comisiones se reparten entre las patas cuya cuenta tiene la **misma moneda** que la venta, proporcional al monto (una comisión en pesos ya no se descuenta como dólares de la cuenta USD).
  - **Propinas:** ya NO restan del balance del flujo (antes se restaban sin sumar la entrada, subestimando la cuenta). Ahora se tratan como pass-through (entran y salen por la misma cuenta — confirmado por el dueño: la propina de tarjeta se paga por tarjeta) → neto cero. Se agregó columna informativa "Propinas ↕" en la tabla y en el Excel. HSBC sube ~3,810 vs. antes. KPI/ventas no cambian (regla #3).
  - Verificado: el total global de comisiones se conserva (42,083.60 MXN-eq); solo se reubica a la cuenta/moneda correcta. KPI no cambia. Dólares: balance ≈2,266 → ≈1,320 USD.
- **Pendiente / nota:** El drill-down de "ingresos de cuenta" sigue filtrando por `venta.cuenta_id`, así que para ventas partidas el detalle puede no sumar exacto al total de la fila. No crítico; revisar si molesta en uso.

---

## [2026-05-04] Gastos · split multi-moneda + dashboard fix

- **Estado:** Branch `claude/fix-gastos-split-multi-currency`. Migración 30 ya aplicada en producción.
- **Bugs reportados:**
  1. El form pedía "cuenta madre" aun cuando se activaba "Dividir pago", aunque las cuentas se definían en cada línea.
  2. El gasto se descontaba TODO de la cuenta madre (primera línea), nunca se distribuía. El dashboard "Flujo por cuenta" leía `gastos.cuenta_id` y `gastos.monto` directos, ignorando `gasto_pagos`.
  3. Un split entre HSBC LAU (MXN) y USD pedía ingresar el monto USD como si fuera MXN porque el form no manejaba per-line currency.
- **Cambios:**
  - `supabase/30_gasto_pagos_multi_moneda.sql`: agrega `moneda`, `tc_momento` y columna generada `monto_mxn` a `gasto_pagos`. Backfill desde `gastos.moneda`+`gastos.tc_momento` (los splits viejos se interpretaban en la moneda del gasto madre).
  - `fn-gastos-form.jsx`:
    - Quita el requisito de cuenta madre cuando hay split.
    - Cada línea muestra su moneda (chip) + equivalente MXN (≈ $X MXN).
    - Validación en MXN: `splitSumMXN ≈ totalMXN` con tolerancia $0.50.
    - Cuando se activa el split, el monto total se reinterpreta en MXN (se convierte automáticamente desde la moneda anterior).
    - Persiste `{moneda, tc_momento}` por línea en `gasto_pagos`.
    - Para gastos con split, `gastos.{monto,moneda,tc_momento}` quedan como `{total_MXN, 'MXN', 1}` para que `gastos.monto_mxn` (generado) sea correcto.
  - `fn-dashboard.jsx`: precarga `gasto_pagos` para gastos con `n_pagos>1` y distribuye correctamente por cuenta destino. Fallback al gasto entero cuando no hay split.
  - `fn-gastos-detalle.jsx`: cada línea de split muestra moneda nativa + equivalente MXN si no es MXN.
- **Datos en producción:** los 3 gastos con split históricos quedaron correctos (todos eran MXN puro a pesar de que una cuenta era USD; coincide con lo capturado).
- **Próximo paso:** abrir PR y probar preview.

---

## [2026-05-03] Permisología: gateo de sidebar, rutas y métricas de turnos

- **Estado:** Branch `claude/fix-permission-restrictions-ayeXa`, PR pendiente.
- **Problema reportado:** Un rol "cajera" con sólo `pv_abrir_turno`/`pv_cerrar_turno`
  veía igual los módulos de Configuración (Cuentas y monedas, Perfiles y permisos, etc.)
  y la barra de "Ventas semanales" en el listado de turnos.
- **Cambios:**
  - `app-preview/src/sidebar-nav.jsx`: filtra los items del sidebar por permiso.
    Gastos requiere `gastos_ver|crear|editar|eliminar`; cada item de Configuración
    requiere su `config_*_ver|editar` o `usuarios_ver|gestionar|roles_gestionar`.
    Si no quedan items de configuración, oculta el separador y el header.
  - `app-preview/src/pages-wrappers.jsx`: agrega componente `<Denied/>` y helper
    `hasAny(...permisos)`. Cada page wrapper de Configuración valida el permiso
    correspondiente y muestra `<Denied/>` si el rol no lo tiene (blinda deep-links).
  - `app-preview/index.html`: gatea las rutas de gastos/dashboard/objetivos/colab
    con `hasAny(...)` y `<Denied/>`.
  - `app-preview/src/fn-turnos-list.jsx`: la barra de métricas (Ventas/Servicios/
    Ticket/Turnos abiertos) ahora se renderiza sólo si `can('turnos_ver_metricas')`.
  - `app-preview/src/fn-perfiles.jsx`: agrega `turnos_ver_metricas` al
    `CATALOGO_PERMISOS` (módulo PV/turnos).
  - `supabase/28_permiso_turnos_ver_metricas.sql`: migración idempotente. admin
    en true (forzado por trigger), encargada en true por default, otros roles
    en false (no abrir acceso silenciosamente).
- **Pendiente del owner:**
  - Correr `28_permiso_turnos_ver_metricas.sql` en Supabase ANTES de mergear
    a main, para que el toggle aparezca en la UI de Perfiles.
- **Próximo paso:** abrir PR draft, probar preview con rol "cajera".
- **Iteración (mismo día):** se detectó que la cajera seguía viendo el listado de
  turnos cerrados de la semana, lo cual rompía la coherencia con ocultar el
  resumen semanal. `turnos_ver_cerrados` ya estaba en el catálogo pero nunca se
  aplicaba; ahora `fn-turnos-list.jsx` lo respeta: si el rol no lo tiene, sólo
  ve `estado='abierto'` y se ocultan los filtros de período/estado/búsqueda
  (no tienen utilidad sin historial). Header pasa a "Turnos abiertos" y empty
  state es "Toca Abrir turno para empezar".

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
