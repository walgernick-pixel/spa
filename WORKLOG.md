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

## [2026-06-15] Turnos · refresco de lista para evitar turno "abierto" stale

- **Estado:** Branch `claude/funny-cannon-69z13s`. Solo frontend (sin migración). Bump SW a v1.3.9.
- **Caso (dueño):** Laura y Tomasa veían un turno del 9-jun como **abierto**, pero en el servidor estaba **cerrado** (folio #844, cerrado el mismo 9-jun 16:47). No podían borrar ventas (4 colabs con comisión ya pagada → bloqueadas con 🔒) ni cerrarlo (operaban sobre copia local vieja). Al dueño/admin no le aparecía porque (a) ya estaba cerrado y (b) el filtro default "Esta semana" (hoy lun 15-jun) deja fuera al 9-jun.
- **Diagnóstico:** La lista de turnos solo se cargaba al montar. El `visibilitychange` global (db.jsx) solo recarga si el tab estuvo oculto >5min, y el evento `online` (offline.jsx) solo refresca catálogos, no la lista. Una tablet que dejaba la lista abierta no se enteraba de que otro dispositivo cerró el turno.
- **Cambio (`fn-turnos-list.jsx`):**
  - `cargar()` acepta `{silent:true}` — refresco en background sin parpadear "Cargando" ni vaciar la lista; suprime el toast de error en silencioso.
  - Nuevo `useEffect`: refresca en silencio al recuperar foco/visibilidad, al volver internet (`online`), y cada 45s mientras la pestaña esté visible y online (polling suave). Solo puede haber 1 turno abierto → el servidor es la verdad.
- **Nota:** No se tocó el PV; al navegar a un turno ya se lee del servidor primero (online). Posible follow-up: mismo refresco-en-foco dentro del PV.

---

## [2026-06-03] Arqueo · cuadre general (netea entre monedas) + badge de lista

- **Estado:** Branch `claude/vibrant-galileo-AHxEG`. Solo frontend (sin migración). Bump SW a v1.3.8.
- **Caso (dueño):** Al dar cambio de USD en pesos, una cuenta queda faltante en una moneda y otra sobrante en otra; por cuenta no cuadran, pero en total sí (ej. −US$0.50 = −$8 MXN compensado con +$8 MXN del conteo manual). El arqueo solo hacía cuadre por cuenta.
- **Cambios:**
  - `fn-arqueo.jsx`: nuevo bloque **"Cuadre general (pesos eq.)"** en el resumen = suma de `(reportado − esperado) × tc` de TODAS las cuentas, incluido el conteo manual (esperado 0). Compensa entre monedas → muestra "Cuadra en general / Sobrante / Faltante".
  - `fn-turnos-list.jsx`: el badge de arqueo ahora usa `(neto_reportado − neto_esperado) × tc` en vez de `diferencia`. Para cuentas normales es idéntico; para conteo manual suma lo contado → el badge refleja el cuadre general (compensa monedas). El turno #0835 pasa de "Faltó $8" a "Cuadró".
- **Nota:** El dashboard sigue usando `diferencia` (manual = 0), así que su "ajuste arqueo" se mantiene por-cuenta/por-moneda (no netea). El neteo cross-moneda vive en el arqueo y el badge.

---

## [2026-06-03] Arqueo · agregar cuenta sin ventas (conteo informativo)

- **Estado:** Branch `claude/vibrant-galileo-AHxEG`. Solo frontend (sin migración). Bump SW a v1.3.7.
- **Caso (dueño):** A veces queda efectivo en una cuenta que no tuvo ventas (ej. dieron cambio de USD en pesos), y el arqueo no mostraba esa cuenta (solo arquea cuentas con ventas). Decisión: opción A — registro **informativo** (no marca sobrante/faltante, no afecta dashboard).
- **Cambio (`fn-arqueo.jsx`):**
  - Botón/selector **"+ Agregar cuenta a arquear"** (solo turno abierto) para cuentas sin ventas.
  - Esas cuentas se agregan a `porCuenta` con `manual:true`, neto esperado 0; se renderiza una tarjeta simple (solo input "contado físicamente" + nota de que es informativo) con botón × para quitar.
  - `doSave`: filas manuales se guardan con `diferencia: 0` (no contaminan el ajuste de arqueo del dashboard ni el badge de la lista).
  - Al cargar, se reconstruyen las cuentas manuales (filas de arqueo cuya cuenta no tuvo ventas).
  - `manualCuentas` state; helpers agregar/quitar (quitar borra la fila guardada).
- **Nota:** No requirió columnas nuevas; usa la tabla `arqueos` con esperado/dif 0.

---

## [2026-06-03] Turnos · confirmación de arqueo en escritorio (cadena de custodia)

- **Estado:** Branch `claude/vibrant-galileo-AHxEG`. Migración 31 YA aplicada en Supabase. Frontend + bump SW a v1.3.6.
- **Petición (dueño):** Además del arqueo de la encargada, un paso de "Confirmar arqueo" cuando el dinero llega al escritorio. Acordado: confirmación SIMPLE (no segundo conteo) a nivel turno, todas las cuentas, permiso nuevo, admin incluido. Para corregir montos se reabre el turno.
- **Migración 31 (`supabase/31_confirmacion_arqueo.sql`):** columnas `arqueo_confirmado_at/por/notas` en `turnos`; `v_turnos_resumen` recreada exponiéndolas + `arqueo_confirmado_por_nombre`; permiso `arqueo_confirmar` (admin true, resto false).
- **Frontend:**
  - `fn-perfiles.jsx`: `arqueo_confirmar` agregado al catálogo (módulo PV/turnos).
  - `fn-arqueo.jsx`: sección "Confirmación de caja (escritorio)" en turnos cerrados — con permiso muestra nota opcional + botón "Confirmar arqueo"; sin permiso muestra "Pendiente de confirmar"; ya confirmado muestra quién/cuándo + nota. `confirmarArqueo()` hace update a turnos (at/por/notas). Lookup del nombre del confirmador.
  - `fn-turnos-list.jsx`: badge "⏳ Por confirmar" / "✓ Confirmado" junto al chip de arqueo.
- **Pendiente:** probar en preview con un rol no-admin que tenga el permiso. (Opcional futuro: que el dashboard distinga confirmados.)

---

## [2026-06-03] Dashboard · flujo de caja cuadra con el arqueo (comisión por pata)

- **Estado:** Branch `claude/vibrant-galileo-AHxEG`. Frontend + bump SW a v1.3.5.
- **Hallazgo (reconciliando efectivo real del dueño, 11-31 may):** El "Balance real" del flujo de caja NO cuadraba con los arqueos / conteo físico (PESOS 9,790 vs 10,520; DÓLARES 1,304 vs 1,258). Causa: en ventas partidas multi-moneda, el dashboard atribuía TODA la comisión a la cuenta de la moneda de la venta, mientras el arqueo la reparte **por pata** (monto_pata × %, en la moneda de cada cajón). Diferencia cuantificada: exacto +730 MXN y −46 USD (= las 6 ventas partidas del periodo).
- **Decisión (dueño):** el arqueo refleja la realidad del cajón; el dashboard debe alinearse a él.
- **Cambio (`fn-dashboard.jsx`):** la comisión del flujo ahora se calcula **por pata = `venta_pago.monto × comision_pct/100` (+ comision_venta_pct si vendedor ≠ ejecutor)**, en la moneda nativa de cada cuenta — misma fórmula que `fn-arqueo.jsx`. Ingresos también netos de descuento por pata. Fallback legacy con comision_monto sobre la cuenta principal.
- **Validado en SQL:** balance teórico nuevo = neto_esperado del arqueo, dif 0.00 en ambas cuentas. Con ajuste arqueo → Balance real = neto_reportado = conteo físico.
- **Nota:** Reemplaza la atribución "misma-moneda proporcional" del PR #82 (era una aproximación; la del arqueo es la fiel). Solo afecta ventas partidas multi-moneda.

---

## [2026-06-03] UX · arqueo directo desde lista + filtros persistentes

- **Estado:** Branch `claude/vibrant-galileo-AHxEG`. Frontend + bump SW a v1.3.4.
- **Peticiones (dueño):**
  1. Desde la lista de cortes, ver el arqueo **por cuenta** sin entrar al PV y scrollear (lo importante: ¿cada cuenta cuadró?, no solo el total).
  2. Mantener los filtros al navegar (entrar a un detalle y volver sin re-poner el rango). Aplica a todos los módulos.
- **Cambios:**
  - `fn-turnos-list.jsx`: el badge de arqueo (✓ Cuadró / ↓ Faltó / parcial) ahora es **clickeable** → navega directo a `#turnos/arqueo/:id` (con `stopPropagation` para no disparar el click del renglón que va al PV). Chevron ` ›` + tooltip como pista. Reutiliza la pantalla de arqueo existente (desglose por cuenta, read-only si cerrado).
  - `db.jsx`: nuevo hook `usePersistedState(key, default)` — como `useState` pero guarda en **sessionStorage** (sobrevive navegación y F5, se limpia al cerrar pestaña).
  - Aplicado a filtros: dashboard (preset/desde/hasta), turnos (preset/desde/hasta/estado), gastos (periodo/cat/cuenta), objetivos (periodoTipo). Search se deja transitorio.
- **Nota técnica:** `usePersistedState` es const global-lexical en db.jsx (mismo patrón que `useDelayedLoading`), accesible por nombre en los fn-*.jsx.

---

## [2026-06-03] Dashboard · propinas dentro de Ingresos (bruto real)

- **Estado:** Branch `claude/vibrant-galileo-AHxEG`. Frontend + bump SW a v1.3.3.
- **Petición (dueño):** Que la columna Ingresos del flujo de caja muestre el **bruto real depositado = ventas + propinas**, para saber cuánto pegó realmente a la cuenta de banco (sobre ese bruto el banco cobra su comisión, que él registra aparte como gasto). Antes la propina iba en columna aparte (↕) sin tocar ingresos ni balance.
- **Cambio (`fn-dashboard.jsx`):**
  - La propina ahora se suma a `ingresos` (bruto) Y se resta en el balance (`balance = ingresos − comisiones − gastos − propinas`) → neto cero, balance idéntico al anterior, pero Ingresos refleja el bruto.
  - Columna "Propinas" pasa de informativa (↕) a deducción (−, color clay). Tooltips y subtítulo actualizados. Excel relabeleado.
  - Columna "Comisiones" sigue siendo la del terapeuta (la comisión del banco/terminal el dueño la mete como gasto, no se modela aquí).
- **Nota:** El drill-down de Ingresos sigue mostrando solo ventas (no la propina). Menor.

---

## [2026-06-03] Turnos · cerrar turno sin servicios

- **Estado:** Branch `claude/vibrant-galileo-AHxEG` (mismo PR #82). Solo frontend.
- **Bug reportado (dueño):** No se podía cerrar un turno que no tuvo ninguna venta — el botón para pasar al arqueo/cierre solo aparecía con ≥1 servicio, obligando a inventar un masaje.
- **Causa:** En `fn-pv.jsx` el bloque "Ir a arqueo" estaba gateado por `ventasPorColab.length > 0`. El cierre real (`fn-arqueo.jsx`) ya soportaba turno vacío (el botón "Cerrar turno" solo pide `estado==='abierto'`, y `doSave` salta el upsert si `porCuenta.length===0`). El único bloqueo era *llegar* a esa pantalla.
- **Decisión (acordada con dueño):** Reusar el mismo camino de cierre (un solo flujo, menos bugs) en vez de un cierre directo aparte. Para turno vacío el arqueo es 0; la pantalla de arqueo vacía sirve de mensaje "sin servicios".
- **Cambios:**
  - `fn-pv.jsx`: el bloque ahora aparece con `estado==='abierto'` aunque no haya ventas; cuando no hay, muestra "Turno sin servicios" y botón **"Cerrar turno"** (icono check) que navega al arqueo.
  - `fn-arqueo.jsx`: el bloque de cierre adapta el copy cuando `porCuenta.length===0` ("no hay arqueo ni recibo que generar, ciérralo directamente") y oculta "Imprimir recibo".

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
