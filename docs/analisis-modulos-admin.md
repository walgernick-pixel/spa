# Análisis del flujo administrativo · CashFlow Spa

Análisis técnico de los módulos administrativos (gastos, catálogo, cuentas y monedas, perfiles, roles y permisos) basado en el código real (`app-preview/src/fn-*.jsx`), migraciones SQL (`supabase/`) y edge function (`supabase/functions/admin-usuarios`).

> Sirve como base de referencia para diseñar un nuevo programa con un giro distinto, conservando los patrones sólidos y corrigiendo lo que ya se identificó como deuda técnica.

---

## 1. Arquitectura general

### Stack
- **Frontend:** React/JSX sin bundler. `<script type="text/babel">` + Babel standalone. Cada feature es un `fn-*.jsx` que se "engancha" en `window` (sobrescribe mocks). Cero build step.
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions). RLS habilitado, anon key hardcoded en `db.jsx`.
- **1 Edge Function:** `admin-usuarios` (Deno) — único endpoint server-side, para CRUD de usuarios con `service_role`.
- **Storage:** bucket `comprobantes` para fotos/PDFs de gastos (signed URLs a 1h).

### Patrones globales
- Helpers en `window`: `sb` (cliente), `notify(msg, tone)`, `confirmar(msg)`, `navigate(path)`, `can(slug)`, `useAuth()`.
- Modal con `setModal({tipo, data})` + render condicional.
- **Soft delete** vía columna `eliminado timestamptz` (null = activo). Las vistas `v_*` filtran `eliminado is null`. Hay vistas espejo `v_*_eliminados` para papelera.
- **Multi-moneda:** cada registro guarda `moneda` (FK a `monedas.codigo`) + `tc_momento` (snapshot del TC al capturar). Columna generada `monto_mxn = monto * tc_momento`.
- **IDs:** UUID v4 en operativos; **PKs de texto** en catálogos (`monedas.codigo`, `categorias_gasto.id` tipo `nomina`/`operativos`, `roles.clave`).

> **Nota:** el `CLAUDE.md` está levemente desactualizado vs el código real:
> - Habla de tabla `catalogo_gastos` única, pero el código real tiene **dos tablas** jerárquicas: `categorias_gasto` (padre) + `conceptos_gasto` (hijo).
> - Lista `cuentas.tipo` como `efectivo|terminal|banco`, pero el form actual ofrece `banco|efectivo|tarjeta`.
> - Menciona "38 permisos" — hoy hay **41+** (se sumaron `turnos_ver_metricas`, `gastos_papelera`, `respaldo_generar`, `turnos_editar_encargado`).
> - Falta documentar la tabla `iva_tasas` (catálogo de tasas IVA configurables).

---

## 2. Esquema de datos administrativo

Las migraciones 01-06 no están versionadas en el repo (se crearon directo en Supabase). Esquema reconstruido del código y migraciones 07-30:

### Catálogos

```
monedas
├─ codigo TEXT PK              -- 'MXN', 'USD', 'CAD', 'EUR'…
├─ label, simbolo
├─ tc_a_mxn NUMERIC            -- editable manual; los movimientos guardan snapshot
├─ es_base BOOLEAN             -- una sola (MXN)
├─ activo, actualizado

cuentas
├─ id UUID PK
├─ label
├─ tipo TEXT                   -- 'banco' | 'efectivo' | 'tarjeta'
├─ moneda TEXT → monedas.codigo    -- INMUTABLE post-creación (regla solo UI)
├─ es_fiscal BOOLEAN           -- declara al SAT
├─ activo, orden, creado

categorias_gasto
├─ id TEXT PK                  -- 'nomina','operativos','servicios','mantenimiento',
│                                  'inversion','administrativo','otros'
├─ label, descripcion, tone    -- tone = chip color
├─ sistema BOOLEAN             -- las seed no se borran fácilmente
├─ orden

conceptos_gasto
├─ id UUID PK
├─ label                       -- 'Sueldo terapeuta', 'Luz CFE', 'Lavandería'…
├─ categoria TEXT → categorias_gasto.id
├─ activo, orden
   UNIQUE (categoria, label)

iva_tasas
├─ id UUID PK
├─ label                       -- 'IVA 16%', 'IVA frontera 8%', 'Exento'
├─ porcentaje NUMERIC(5,2)
├─ es_default BOOLEAN          -- una sola; se aplica al form de nuevo gasto
├─ sistema, activo, orden
```

### Operación

```
gastos
├─ id UUID PK, folio           -- folio autoincremental
├─ fecha DATE
├─ concepto_id → conceptos_gasto.id
├─ proveedor TEXT              -- libre, con datalist de previos
├─ cuenta_id → cuentas.id      -- "madre"; con split es la 1ª línea
├─ monto NUMERIC               -- en moneda nativa; con split queda en MXN
├─ moneda TEXT → monedas.codigo
├─ tc_momento NUMERIC          -- snapshot del TC
├─ monto_mxn NUMERIC           -- columna GENERATED (monto * tc_momento)
├─ es_facturable BOOLEAN       -- ¿tiene factura?
├─ iva_pct NUMERIC(5,2)        -- por porcentaje
├─ iva_monto NUMERIC(12,2)     -- override manual cuando IVA ≠ 16% × total
├─ subtotal, iva_importe       -- columnas GENERATED desde monto + iva_pct
├─ descripcion, notas
├─ comprobante_url             -- path en storage 'comprobantes'
├─ creado, editado, creado_por uuid → auth.users
├─ eliminado timestamptz, eliminado_por uuid    -- soft delete

gasto_pagos                    -- split por gasto (1..N filas)
├─ id, gasto_id → gastos.id (cascade)
├─ cuenta_id → cuentas.id
├─ monto NUMERIC               -- en moneda nativa de la cuenta de esa línea
├─ moneda TEXT, tc_momento NUMERIC    -- mig 30: multi-moneda por línea
├─ monto_mxn GENERATED (monto * tc_momento)
├─ orden INT

gastos_historial               -- bitácora
├─ id, gasto_id, accion        -- 'creado'|'editado'|'archivado'|'restaurado'|'eliminado'
├─ cambios JSONB               -- diff {campo: {de, a}}
├─ usuario_label, creado

config_fiscal                  -- singleton (id=1)
├─ nombre_empresa, rfc
├─ regimen TEXT check          -- 'resico_pm'|'rgl'|'resico_pf'|'pfae'|'custom'
├─ isr_pct, iva_pct_default
├─ activo BOOLEAN              -- prende el cálculo en dashboard
├─ notas, updated_at
```

### Auth / permisos

```
perfiles
├─ id UUID PK → auth.users(id) ON DELETE CASCADE
├─ email TEXT                  -- email "interno": <username>@xcalacoco.local
├─ username TEXT UNIQUE         -- lowercase, [a-z0-9_.]{3,32}
├─ nombre_display TEXT
├─ rol TEXT → roles.clave (ON UPDATE CASCADE, RESTRICT DELETE)
├─ colaboradora_id → colaboradoras (opcional, linka a personal operativo)
├─ activo, creado, actualizado

roles
├─ clave TEXT PK               -- 'admin', 'encargada', 'cajera'…
├─ nombre, descripcion
├─ protegido BOOLEAN           -- admin=true, intocable
├─ permisos JSONB              -- {"pv_abrir_turno": true, "gastos_ver": true, …}
├─ creado, actualizado

   TRIGGER roles_proteger      -- admin: protegido inmutable, permisos forzados a true
   FUNCTION tiene_permiso(slug) STABLE   -- helper para RLS (definido pero no usado aún)
```

### Vistas clave
- **`v_gastos`** — JOIN gastos + conceptos + categorías + cuentas. Expone `concepto`, `categoria`, `categoria_tone`, `cuenta`, `cuenta_tipo`. Filtra `eliminado is null`. Recalcula `subtotal`/`iva_pct`/`iva_importe` si `iva_monto` (manual) está presente.
- **`v_gastos_eliminados`** — espejo, `eliminado is not null`. Suma `eliminado_por`.

---

## 3. Módulos en detalle

### A) Cuentas y Monedas · `fn-config-cuentas.jsx` (460 LOC)

**Pantalla:** 3 pestañas — Cuentas / Monedas y TC / Fiscal.

**Lógica clave:**
- `FormCuenta`: nombre + tipo + moneda + `es_fiscal` + `activo`. **Moneda inmutable** post-creación (la regla está sólo en UI, no en DB). El warning lo dice explícitamente.
- `FormMoneda`: codigo (3-4 letras, uppercase, inmutable) + label + simbolo + `tc_a_mxn` + `es_base`. Si marcas `es_base`, el form auto-desmarca la anterior (transacción manual, no atómica — riesgo bajo de tener 2 bases si falla en medio).
- `FormTCMoneda`: edición rápida sólo del TC. Avisa que "los gastos ya capturados no se recalculan" (porque cada uno tiene `tc_momento` snapshot).
- **Borrado:** falla suave si tiene gastos asociados (mensaje "archívala en su lugar") — la app no implementa restore para cuentas/monedas, sólo soft con `activo=false`.

**Lo bueno:**
- Patrón claro: catálogo plano con CRUD + flag `activo` + advertencia sobre inmutabilidad (moneda).
- TC snapshot por movimiento = correcto contablemente.

**Lo a tener cuidado:**
- La inmutabilidad de moneda en cuenta **no está enforced en DB**. Si la migras a tu programa, agrega un trigger `prevent_moneda_change`.
- El cambio de moneda base no es atómico (dos UPDATE consecutivos). En producción multi-usuario eso podría dejar 2 bases.

---

### B) Catálogo de gastos · `fn-config-catalogo.jsx` (452 LOC)

**Pantalla:** 3 pestañas — Conceptos / Categorías / IVA.

**Jerarquía:** `categorias_gasto` (padre, ID texto, 7 seeds) → `conceptos_gasto` (hijo, UUID, N por categoría).

**Lógica clave:**
- `FormConcepto`: label + categoría + `activo`. UNIQUE(categoria, label) — error `23505` traducido.
- `FormCategoria`: ID auto-derivado del label (lowercase, `[^a-z0-9]→_`) si no se pasa. Tones predefinidos: clay/moss/ocean/amber/rose/neutral. `sistema=false` para las creadas por usuario.
- `FormIvaTasa`: label + porcentaje + `es_default` (toggle único, hace UPDATE masivo de otros antes de set). `sistema=true` para seeds (no se pueden borrar, solo desactivar).
- **Borrado de categoría:** validación cliente — se cuenta `conceptos.filter(c=>c.categoria===k.id)` y rechaza si `>0`. Esto se evalúa en JS, **no es safety net real** (un INSERT/UPDATE concurrente lo evade).

**Lo bueno:**
- Jerarquía limpia, fácil de extender.
- Separación de `sistema` vs propio (defensa contra "borrar accidentalmente lo que viene seed").
- Acordeón por categoría con expand/collapse persistido en state local.

**Lo a tener cuidado:**
- ID texto en categorías facilita seeds reproducibles pero ata el código (`CAT_TONE_COLOR[kat.id]` está hardcodeado con `nomina/operativos/servicios/...`).
- La validación de "no borrar con conceptos" debería ser un FK con `ON DELETE RESTRICT` o un trigger, no solo client-side.

---

### C) Gastos · 4 archivos (~1364 LOC totales)

#### `fn-gastos-list.jsx` (426)
- **KPIs mes:** total mes / mes anterior con delta %, count, sin comprobante, top categoría.
- **Filtros:** búsqueda libre (client-side sobre el resultado), periodo (mes/mes-1/3m/6m/año/todo), categoría, cuenta.
- **Agrupación visual** por fecha con subtotal.
- **Splits:** si `n_pagos > 1`, hace fetch extra a `gasto_pagos` y los renderea inline en el row.

#### `fn-gastos-form.jsx` (624) — **el más complejo**
Flujo de captura con varias dimensiones:
1. **Fecha + Concepto → categoría auto-derivada** (chip).
2. **Proveedor** con datalist construido del histórico (`v_gastos.proveedor` distinct, limit 500).
3. **Cuenta → moneda derivada** (no editable en el form, viene de `cuentas.moneda`).
4. **Monto total** en moneda nativa de la cuenta, con conversión MXN en vivo (TC del momento).
5. **Toggle facturable** → habilita panel IVA con 3 modos:
   - Tasa preconfigurada de `iva_tasas`
   - Porcentaje custom (escribes %)
   - **Monto manual** (escribes $ directo cuando la factura mezcla productos con/sin IVA)
6. **Split de pagos** multi-cuenta y multi-moneda (mig 30):
   - Al activar, el monto total se **reinterpreta a MXN** (porque las líneas pueden estar en monedas distintas).
   - Cada línea tiene cuenta + monto en moneda nativa + chip de moneda + equivalente MXN en vivo.
   - Validación: `|sumMXN − totalMXN| < 0.50`.
   - El `gastos.monto/moneda/tc` se persiste como `(totalMXN, 'MXN', 1)`; el reparto real vive en `gasto_pagos`.
7. **Comprobante** a Storage (`comprobantes/gastos/{ts}_{random}.{ext}`) con preview pre-upload.
8. **Empty guard:** si no hay cuentas/conceptos, muestra CTA para configurar antes.

#### `fn-gastos-detalle.jsx` (352)
- Trae de `v_gastos` (activos) o cae a `gastos` raw con joins (archivados).
- Muestra: monto + desglose IVA + cuenta + proveedor + fecha + capturado por (resuelve `creado_por` → `perfiles`).
- Splits con monto nativo + equivalente MXN.
- **Acciones según estado:**
  - Activo: Editar / Archivar (soft, set `eliminado` + `eliminado_por`).
  - Archivado: Restaurar (set `eliminado=null`) / Eliminar definitivo (delete + remove storage).
- Historial con timeline de acciones (`gastos_historial`), renderea diff JSONB de `cambios`.

#### `fn-gastos-papelera.jsx` (181)
Lee `v_gastos_eliminados` ordenado por `eliminado desc`, resuelve nombres de eliminadores en 1 query batch, ofrece Restaurar / Eliminar definitivo por fila.

**Lo bueno (de todo el módulo):**
- Bitácora completa con diff visible.
- Split multi-moneda bien resuelto: cada línea tiene snapshot independiente.
- Soft delete con auditoría (quién/cuándo) y restauración.
- IVA con 3 modos cubre casos reales de facturas reales.
- Empty states con guía a configurar prerequisitos.

**Lo a tener cuidado:**
- `gastos_historial.cambios` es JSONB libre, no hay schema — el form actual **siempre lo deja null en editar/crear**. Solo registra la `accion`; el diff nunca se llena. La UI de "ver diff" del detalle existe pero está muerta.
- `gastos_historial.usuario_label` — el form **nunca lo escribe**; el detalle muestra "Sistema" como fallback. Hay que poblarlo o derivarlo via JOIN a perfiles.
- El borrado del comprobante en storage al "eliminar definitivo" **no es transaccional** con el DELETE de la fila. Si la red falla entre `storage.remove` y `gastos.delete`, queda huérfano.

---

### D) Perfiles · `fn-perfiles.jsx` (658) + `fn-auth.jsx` (313) + edge function `admin-usuarios` (149)

#### Flujo de auth (login)
1. Usuario teclea `username` + password. El cliente arma `email = <user>@xcalacoco.local`.
2. `sb.auth.signInWithPassword({email, password})`.
3. Si OK, fetch `perfiles` + `roles` y cachea **PBKDF2-SHA256 + IndexedDB** para fallback offline (TTL 14 días).
4. Si error es "invalid credentials" → no intenta offline. Si es network error → intenta offline.
5. `window.__auth = {session, perfil, rolData}` notifica listeners via pub-sub manual.

#### `can(slug)` real
```js
if (perfil.rol === 'admin') return true;       // hardcoded safety net
if (rolData?.permisos && slug in rolData.permisos) return !!rolData.permisos[slug];
return false;
```

#### Admin de usuarios (UI)
- Tabla con username, nombre, rol, activo. Acciones: Editar / Reset password / Eliminar.
- **Todos los CRUD pasan por la Edge Function** `admin-usuarios` (necesita `service_role` para tocar `auth.users`).
- Edge function valida que el caller sea `rol='admin' AND activo=true` antes de cualquier acción.
- Operaciones: `crear`, `editar`, `reset_password`, `eliminar`. No permite auto-eliminación.

#### Admin de roles (UI)
- Acordeón por rol; expandes y togglea cada permiso individualmente. UPDATE inmediato a `roles.permisos`.
- Crear rol: clave + nombre + descripción. Todos los permisos arrancan en `false`.
- Eliminar rol: bloqueado si tiene usuarios asignados o si es `protegido`.
- Editar admin: trigger `roles_proteger_admin` coerce a `true` cualquier intento de bajar un permiso, e impide cambiar `clave`/`protegido`/DELETE.

**Lo bueno:**
- **Permisología totalmente dinámica**: agregar un permiso nuevo solo requiere (1) sumarlo al catálogo `CATALOGO_PERMISOS` en `fn-perfiles.jsx`, (2) migración SQL idempotente que hace `permisos || '{"slug": true/false}'::jsonb`, (3) usarlo en código con `can('slug')`. La UI lo expone automático.
- Trigger anti-borrado de admin con **coerción defensiva** (mig 22) — incluso si alguien manda UPDATE con permisos en false, el trigger los reescribe a true. Muy buena pieza.
- Login offline con PBKDF2 100k iteraciones + 14d TTL, sin auto-restore (siempre pide password). Bien diseñado.
- Edge function valida rol contra DB (no se queda solo con el JWT claim).

**Lo a tener cuidado:**
- **`ANON_COMO_ADMIN = true`** en `fn-auth.jsx:11`. Mientras esté `true`, cualquier visitante sin sesión actúa como admin. Es una flag transicional que el dueño debe apagar.
- El gate por `can()` es **solo cliente**. La RLS server-side todavía depende de `current_rol() = 'admin'` (heredado de mig 17, antes del sistema dinámico). Esto significa que un usuario malicioso podría bypassear con queries directas a Supabase si su `rol` no es admin pero quiere leer/escribir cosas que el cliente le esconde. La defensa real está en RLS, y RLS no usa `tiene_permiso()` aún. Hay un helper `tiene_permiso(slug)` definido (mig 19) pero **ninguna política lo invoca**. Es una deuda grande.
- La función `current_rol()` se invoca en RLS para `perfiles` y `roles`; cualquier rol no-admin no puede modificar perfiles/roles **vía SQL directo**. Pero para `gastos`, `cuentas`, `monedas`, etc., RLS está abierto a `public` (ver mig 14 `acceso_publico`). Si abres acceso público sin login real, cualquiera con la anon key puede borrar gastos.

---

### E) Catálogo completo de permisos (referencia)

Agrupados en 8 módulos (definidos en `fn-perfiles.jsx` → `CATALOGO_PERMISOS`):

| Módulo | Permisos |
|---|---|
| **PV / Turnos** | `pv_abrir_turno`, `pv_cerrar_turno`, `pv_registrar_venta`, `pv_firmar_cobro`, `pv_pagar_comis`, `turnos_ver_metricas`, `turnos_ver_cerrados`, `turnos_reabrir`, `turnos_editar_cerrado`, `turnos_eliminar`, `turnos_editar_encargado`, `arqueo_eliminar` |
| **Gastos** | `gastos_ver`, `gastos_crear`, `gastos_editar`, `gastos_eliminar`, `gastos_marcar_pagado`, `gastos_exportar`, `gastos_papelera` |
| **Dashboard** | `dashboard_ver`, `dashboard_ver_fiscal`, `dashboard_ver_utilidad`, `dashboard_ver_rankings`, `dashboard_exportar` |
| **Objetivos** | `objetivos_ver`, `objetivos_crear`, `objetivos_editar`, `objetivos_eliminar` |
| **Fiscal** | `fiscal_ver_config`, `fiscal_editar_config` |
| **Configuración** | `config_cuentas_ver`, `config_cuentas_editar`, `config_catalogo_ver`, `config_catalogo_editar`, `config_servicios_ver`, `config_servicios_editar`, `config_colab_ver`, `config_colab_editar` |
| **Usuarios / roles** | `usuarios_ver`, `usuarios_gestionar`, `roles_gestionar` |
| **Respaldo** | `respaldo_generar` |

**Para agregar un permiso nuevo (3 sitios):**
1. Sumarlo a `CATALOGO_PERMISOS` en `fn-perfiles.jsx` (`id` + `label` dentro de su módulo).
2. Migración SQL idempotente:
   ```sql
   update roles set permisos = permisos || '{"nuevo_slug": true}'::jsonb where clave = 'admin';
   update roles set permisos = permisos || '{"nuevo_slug": false}'::jsonb where clave <> 'admin' and not (permisos ? 'nuevo_slug');
   ```
3. Usarlo en código: `if (can('nuevo_slug')) ...` o `{can('nuevo_slug') && <Btn />}`.

---

## 4. Observaciones cruzadas / tech debt

| Punto | Impacto | Dónde |
|---|---|---|
| `ANON_COMO_ADMIN=true` | Cualquier visitante = admin hasta que se apague | `fn-auth.jsx:11` |
| RLS no usa `tiene_permiso()` | Permisos solo se enforce en cliente | `tiene_permiso` definida en mig 19, sin policies que la llamen |
| Migraciones 01-06 no versionadas | Esquema base sólo vive en Supabase | falta en `/supabase/` |
| `CLAUDE.md` desactualizado | Schemas y conteos viejos | ver §1 |
| `gastos_historial.cambios` siempre null | Diff visual existe pero nunca se llena | `fn-gastos-form.jsx:311` |
| `gastos_historial.usuario_label` nunca se escribe | Fallback "Sistema" en historial | mismo archivo |
| Inmutabilidad de `cuentas.moneda` solo en UI | Trigger faltante en DB | — |
| Cambio de moneda base no atómico | Race podría dejar 2 bases | `FormMoneda.guardar` |
| Borrado de comprobante no transaccional con DELETE | Archivos huérfanos posibles | `fn-gastos-detalle.jsx:111` |
| Sin code splitting / Babel standalone | Carga inicial lenta | reconocido en CLAUDE.md |

---

## 5. Recomendaciones para un nuevo programa

Aprovechando lo bueno y corrigiendo lo malo:

### Conservar tal cual (patterns sólidos)

1. **Soft delete con vista doble** (`v_x` para activos, `v_x_eliminados` para papelera). Limpio y reusable.
2. **Multi-moneda con snapshot por movimiento** (`moneda` + `tc_momento` + `monto_mxn` generated). Es la única forma correcta contablemente.
3. **Splits multi-moneda por línea** (mig 30) — diseño robusto.
4. **Catálogo jerárquico** (categorías → conceptos) + tasas IVA configurables. No fuerces todo plano.
5. **Roles dinámicos con permisos JSONB** + catálogo en código + migraciones idempotentes `permisos || '{...}'::jsonb`. El patrón "agregar permiso = 3 sitios" es predecible.
6. **Trigger anti-borrado de admin con coerción** (mig 22). Replícalo.
7. **Edge function única para auth admin** con validación de rol server-side. Bien encapsulado.
8. **Login con username sin email real** (`@dominio.local`). Limpio para usuarios no técnicos.

### Cambiar / mejorar

1. **RLS real usando `tiene_permiso(slug)`**. Define políticas reales para cada tabla operativa (`gastos`, `cuentas`, etc.) en lugar de `acceso_publico`. Hoy todo depende del cliente.
2. **Versiona TODAS las migraciones desde la 01**. Si el repo es la fuente de verdad, no puede haber esquema "fantasma" en Supabase.
3. **Implementa de verdad el diff de `gastos_historial.cambios`**: en el form, calcula diff antes de UPDATE y persiste `{campo: {de, a}}`. La UI ya lo renderea.
4. **Trigger DB para `prevent_change_moneda_cuenta`** y para `unique_base_moneda` (mig). No dependas de UI.
5. **Operación "eliminar gasto definitivo" debe ser una RPC/Edge function** que haga storage.remove + DELETE en una transacción (o al menos compensación si falla).
6. **Apaga `ANON_COMO_ADMIN`** desde el día 1. Bloquea acceso sin sesión.
7. **Si vas a tener build step**, mete bundling (Vite). El argumento "1 solo usuario" ya no aplica si crece a varios negocios / sucursales.

---

## Apéndice: archivos relevantes del repo

```
app-preview/src/
├─ db.jsx                     -- cliente Supabase + helpers globales
├─ fn-auth.jsx                -- login, can(), offline auth (PBKDF2)
├─ fn-perfiles.jsx            -- UI admin usuarios + roles + permisos
├─ fn-config-cuentas.jsx      -- CRUD cuentas, monedas y TC, fiscal
├─ fn-config-catalogo.jsx     -- CRUD categorías, conceptos, IVA
├─ fn-gastos-list.jsx         -- lista + KPIs mes + filtros
├─ fn-gastos-form.jsx         -- captura/edición con IVA + split multi-moneda
├─ fn-gastos-detalle.jsx      -- vista + acciones soft/hard delete + historial
└─ fn-gastos-papelera.jsx     -- restaurar / eliminar definitivo

supabase/
├─ 14_fiscal.sql              -- cuentas.es_fiscal, gastos.es_facturable, config_fiscal
├─ 15_fiscal_v2.sql           -- iva_monto manual, v_gastos recreada
├─ 17_auth_roles.sql          -- perfiles + trigger handle_new_user + current_rol()
├─ 18_username_login.sql      -- username + dominio interno
├─ 19_roles_dinamicos.sql     -- tabla roles + seeds admin/encargada + tiene_permiso()
├─ 22_fix_admin_permisos_trigger.sql   -- coerción admin = todos true
├─ 23_papelera_gastos.sql     -- eliminado_por + v_gastos_eliminados + permiso papelera
├─ 28_permiso_turnos_ver_metricas.sql
├─ 29_permiso_respaldo_generar.sql
├─ 30_gasto_pagos_multi_moneda.sql     -- moneda + tc_momento por línea de split
└─ functions/admin-usuarios/index.ts   -- edge function CRUD usuarios
```
