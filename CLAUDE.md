# CLAUDE.md — Guía técnica de CashFlow Spa

SPA en React/JSX **sin bundler** sobre Supabase, deployada en Netlify. App monolítica de página única para gestión de un spa: PV, gastos, arqueo, comisiones, dashboard. La app real vive en `app-preview/src/`.

> **Para Claude:** Antes de empezar revisa `WORKLOG.md` (ahí queda el estado en progreso entre sesiones). Al cerrar sesión, actualiza `WORKLOG.md` con cambios sin commitear, decisiones y próximos pasos.

## Estructura de carpetas

```
/home/user/spa/
├── app-preview/              # APP REAL (lee aquí)
│   ├── index.html            # Entry: <script type="text/babel"> + Babel standalone
│   ├── manifest.webmanifest
│   ├── pwa/                  # Iconos PWA
│   └── src/                  # Módulos fn-*.jsx
├── mockups/src/              # Primitivos UI + tokens.css + sidebar/screens mock
├── src/                      # Pantallas viejas (legacy, fallback)
├── supabase/                 # Migraciones SQL + functions/admin-usuarios/
├── docs/                     # Documentación (plan, no código)
├── netlify.toml              # Redirect / → /app-preview/
└── README.md
```

**Sin build step.** El navegador carga JSX vía `<script type="text/babel">` con Babel standalone. Cambios = guardar archivo + F5.

## Archivos JSX por feature

Todos en `app-preview/src/`. Cada uno expone funciones al `window` para uso global.

### Core
- **db.jsx** — Cliente Supabase (`sb`), helpers `notify()`, `confirmar()`, `can()` stub
- **router.jsx** — Hash router, `useRoute()`, `navigate(path)`
- **sidebar-nav.jsx** — `<AppShell>` con sidebar (gated por `can()`)
- **pages-wrappers.jsx** — Wrappers comunes de pantalla
- **fn-auth.jsx** — Login, sesión global `window.__auth`, `useAuth()`, `can()` real
- **fn-perfiles.jsx** — Admin de usuarios/roles/permisos (UI + edge function)

### Turnos / PV / Arqueo
- **fn-turnos-list.jsx** — Lista de turnos, filtros, abrir/reabrir
- **fn-pv.jsx** — PV en turno (cards V/A terapeutas/Descuentos/Neto, lista de ventas)
- **fn-pv-components.jsx** — `FormVenta` (modal editar servicio), `ColabBlockFn`, `FirmaModal`
- **fn-arqueo.jsx** — Cierre por cuenta (efectivo/terminal/banco), `porCuenta` useMemo
- **fn-recibo-print.jsx** — Recibo imprimible (oculto en pantalla, visible en print)

### Gastos
- **fn-gastos-list.jsx** — Lista con KPIs del mes, filtros (período, categoría, cuenta)
- **fn-gastos-form.jsx** — Captura/edición (categoría, monto, IVA, comprobante, splits)
- **fn-gastos-detalle.jsx** — Vista de un gasto: archivar (soft) / restaurar / eliminar definitivo

### Dashboard / Objetivos
- **fn-dashboard.jsx** — KPIs ingresos/gastos/utilidad, gráficos, exportar Excel
- **fn-objetivos.jsx** — Lista de metas + cálculo de avance
- **fn-objetivos-form.jsx** — Crear/editar objetivo
- **fn-objetivos-calc.jsx** — Motor de cálculo (% alcanzado, proyección)

### Configuración
- **fn-config-cuentas.jsx** — CRUD cuentas (efectivo/terminal/banco, moneda, `es_fiscal`)
- **fn-config-catalogo.jsx** — CRUD categorías de gastos
- **fn-config-servicios.jsx** — CRUD servicios + canales (comisión %)
- **fn-config-colaboradoras.jsx** — CRUD personal (RFC, comisión por defecto)
- **fn-config-fiscal.jsx** — Régimen fiscal (RFC empresa, ISR, IVA)
- **fn-respaldo.jsx** — Backup manual a JSON

## Schema Supabase

### Tablas principales

**Operación**
- `turnos` — id, folio, fecha, hora_inicio, hora_fin, estado(abierto|cerrado), encargada_id, reaperturas, reabierto_at, creado, cerrado, notas
- `ventas` — id, folio, fecha, turno_id, servicio_id, colaboradora_id, vendedora_id, canal_id, cuenta_id, **precio**, **descuento**, comision_pct/monto, comision_venta_pct/monto, propina, moneda, tc_momento, notas, creado, **eliminado** (soft)
- `venta_pagos` — id, venta_id, cuenta_id, tipo(servicio|propina), monto, **descuento**, orden
- `turno_colaboradoras` — turno_id, colaboradora_id, comision_pagada_at, firma_data_url, firmado_at
- `arqueos` — turno_id, cuenta_id, moneda, neto_esperado, neto_reportado, diferencia, notas, creado

**Gastos**
- `gastos` — id, fecha, catalogo_id, monto, moneda, tc_momento, monto_mxn, cuenta_id, es_facturable, iva_pct, comprobante_url, notas, pagado_at, creado, **eliminado** (soft), creado_por
- `gasto_pagos` — splits por gasto
- `gastos_historial` — bitácora de eventos (archivado, restaurado, etc)

**Catálogos**
- `servicios` — codigo, label, duracion_min, precio_base, activo, orden
- `canales_venta` — id, label, comision_default, permite_comision_venta, comision_venta_pct, tone, activo, orden
- `colaboradoras` — id, nombre, alias, rfc, comision_pct, activo, orden
- `cuentas` — id, label, tipo(efectivo|terminal|banco), moneda, es_fiscal, activo, orden
- `monedas` — codigo, label, simbolo, tc_a_mxn, es_base
- `catalogo_gastos` — id, label, category_label, tone, activo, orden

**Auth / config**
- `auth.users` (Supabase) → `perfiles` (id FK, username, nombre_display, rol FK, colaboradora_id, activo)
- `roles` — clave (PK), nombre, descripcion, protegido, **permisos** (JSONB con 38 keys booleanas)
- `config_fiscal` — singleton con RFC empresa, régimen, ISR/IVA defaults
- `objetivos` — id, periodo, periodo_fecha, tipo, monto_objetivo

### Vistas

- `v_ventas` — JOIN denormalizado, expone `monto_spa`, `precio_mxn`, `descuento_mxn`, `comision_mxn`, `propina_mxn`, etc. **Filtra `eliminado is null`.**
- `v_turnos_resumen` — Agregados por turno (total_mxn, descuentos_mxn, comisiones_mxn, propinas_mxn, n_servicios, n_pagos_pendientes)
- `v_gastos` — JOIN gastos+catalogo+cuenta+creador. Filtra `eliminado is null`.

### Convenciones

- **Soft delete:** columna `eliminado timestamptz` NULL = activo. Las vistas `v_*` filtran `eliminado is null`.
- **Moneda:** `moneda` (3 letras) + `tc_momento` snapshot al guardar. Conversión MXN: `monto * tc_momento`.
- **IDs:** uuid v4 auto.
- **Timestamps:** `creado`, `actualizado`, `cerrado`, etc en ISO timestamptz.
- **Idempotencia:** migraciones usan `if not exists`, `drop view if exists`, etc. Se pueden re-correr sin daño.

## Sistema de permisos (importante)

Permisos dinámicos en tabla `roles.permisos` (JSONB con 38 claves booleanas).

**Roles seed:** `admin` (protegido, todos true), `encargada` (operación limitada).

**Catálogo de permisos** (definido en `fn-perfiles.jsx`, agrupado en módulos):

1. **PV/turnos:** `pv_abrir_turno`, `pv_cerrar_turno`, `pv_registrar_venta`, `pv_firmar_cobro`, `pv_pagar_comis`, `turnos_ver_cerrados`, `turnos_reabrir`, `turnos_editar_cerrado`, `turnos_eliminar`, `turnos_editar_encargado`, `arqueo_eliminar`
2. **Gastos:** `gastos_ver`, `gastos_crear`, `gastos_editar`, `gastos_eliminar`, `gastos_marcar_pagado`, `gastos_exportar`
3. **Dashboard:** `dashboard_ver`, `dashboard_ver_fiscal`, `dashboard_ver_utilidad`, `dashboard_ver_rankings`, `dashboard_exportar`
4. **Objetivos:** `objetivos_ver`, `objetivos_crear`, `objetivos_editar`, `objetivos_eliminar`
5. **Fiscal:** `fiscal_ver_config`, `fiscal_editar_config`
6. **Configuración:** `config_cuentas_ver/editar`, `config_catalogo_ver/editar`, `config_servicios_ver/editar`, `config_colab_ver/editar`
7. **Usuarios:** `usuarios_ver`, `usuarios_gestionar`, `roles_gestionar`

**Verificar en código:** `if (!can('slug')) return <Denied/>` o `{can('slug') && <Btn .../>}`. La función `can()` real está en fn-auth.jsx; admin siempre devuelve `true`, otros leen `rolData.permisos[slug]`.

**Agregar un permiso nuevo:**

1. Agregar al catálogo en `fn-perfiles.jsx` → `CATALOGO_PERMISOS` (objeto con id/label en su módulo).
2. Migración SQL: `update roles set permisos = permisos || '{"nuevo_slug": true}'::jsonb where clave = 'admin';` (false para los demás).
3. Usar en código: `can('nuevo_slug')`.
4. La UI de admin (config/perfiles) lo renderiza automático desde el catálogo.

## Patrones globales

### Helpers en `window`
- `sb` — cliente Supabase
- `notify(msg, tone)` — toast 2.5s. tone: 'ok' (default) | 'err' | 'warn'
- `confirmar(msg)` — wrapper de `window.confirm()`
- `navigate(path)` — set hash
- `can(slug)` — permiso dinámico
- `SUPABASE_URL`, `SUPABASE_ANONKEY`

### Primitivos UI (`mockups/src/primitives.jsx`)
- `Icon({name, size, stroke, color})` — SVG inline (50+ iconos lucide-style)
- `Btn({variant, icon, size, onClick})` — variantes: primary, clay, moss, secondary, ghost, danger
- `Chip({tone, children})` — tones: neutral, moss, clay, amber, blue, rose, ink
- `Av({name, tone, size})` — avatar circular con iniciales
- `Money({amount, currency, size, weight, color, signed})` — monto serif

### Tokens CSS (`mockups/src/tokens.css`)
- Tinta: `--ink-0` (oscuro) → `--ink-4` (faint)
- Papel: `--paper`, `--paper-raised`, `--paper-sunk`, `--paper-stone`
- Marca: `--clay` (terracota), `--moss` (oliva), `--sand`, `--ink-blue`, `--rose`, `--amber`
- Tipografía: `--serif` (Fraunces, números), `--sans` (Geist, UI), `--mono`
- Líneas: `--line-1`, `--line-2`

### Patrón modal
```jsx
const [modal, setModal] = React.useState(null);
{modal && <Modal onClose={()=>setModal(null)}>...</Modal>}
setModal({tipo:'editar', data:{...}});
```

### Patrón soft delete + restore
```jsx
// Archivar (soft)
await sb.from('gastos').update({eliminado: new Date().toISOString()}).eq('id', id);
// Restaurar
await sb.from('gastos').update({eliminado: null}).eq('id', id);
// Eliminar permanente
await sb.from('gastos').delete().eq('id', id);
// Las vistas v_gastos ya filtran eliminado is null
```

### Rutas (hash)
`#login`, `#turnos`, `#turnos/pv/:id`, `#turnos/arqueo/:id`, `#gastos`, `#gastos/:id`, `#dashboard`, `#objetivos`, `#config/cuentas`, `#config/catalogo`, `#config/servicios`, `#config/colaboradoras`, `#config/fiscal`, `#config/perfiles`

## Build / deploy

- **Local:** `python3 -m http.server 8000` desde la raíz, abrir `http://localhost:8000/app-preview/`. No hay dev server, no hay build.
- **Netlify:** sirve `app-preview/` como root. `netlify.toml` redirige `/` → `/app-preview/`. Sin variables de entorno (anon key hardcoded en db.jsx, RLS protege datos).
- **Branch previews automáticos:** cada PR genera un deploy preview en Netlify (estado pendiente luego success).

## Migraciones SQL (orden y propósito)

| # | Archivo | Propósito |
|---|---------|----------|
| 07 | seed_pv_inicial | Seeds iniciales (canales, servicios, monedas) |
| 08 | colaboradoras_rfc | RFC en colaboradoras |
| 09 | comision_por_venta | Vendedor distinto del ejecutor |
| 10 | firmas_digitales | Firma base64 en turno_colaboradoras |
| 11 | arqueo_por_cuenta_y_reaperturas | Arqueo por cuenta (no moneda) + reaperturas |
| 12-13 | objetivos / objetivos_v2 | Tabla y mejoras de objetivos |
| 14-15 | fiscal / fiscal_v2 | Régimen fiscal, IVA, es_facturable |
| 16 | cascade_delete_turnos | FKs con CASCADE |
| 17 | auth_roles | perfiles + roles hardcoded |
| 18 | username_login | Login por username (dominio interno) |
| 19 | roles_dinamicos | Permisos JSONB en roles |
| 20 | descuentos | Descuento en ventas y venta_pagos |

## Tech debt / cosas a tener en cuenta

- **`ANON_COMO_ADMIN = true`** en fn-auth.jsx — permite acceso sin login durante transición. TODO: poner false cuando todos tengan cuenta.
- **`/src/` raíz** — pantallas viejas, reemplazadas por `app-preview/src/fn-*.jsx`. Aún cargan como fallback.
- **`app.html`** — versión legacy, deprecated.
- **Sin code splitting / sin lazy loading** — todo se carga en el primer pintado.
- **Babel standalone** compila JSX en navegador → carga inicial más lenta. No vale la pena meter bundler para un solo usuario.
- **Inline styles dominantes** — no hay CSS modules. Tokens vienen de tokens.css.

## Reglas de negocio críticas (acordadas con dueño)

1. **Comisión del terapeuta = sobre precio BRUTO** (antes de descuento).
2. **Descuento lo asume el spa** — reduce lo que paga el cliente y lo que entra a la cuenta.
3. **Propinas son independientes** — 100% al terapeuta, NO entran al corte de caja, NO afectan el neto al spa.
4. **Comisiones salen de la misma cuenta donde entró la venta** (efectivo, banco, lo que sea).

## Convenciones útiles para Claude

- Para tocar UI: prefiere editar el `fn-*.jsx` que YA implementa esa pantalla, no crear nuevo.
- Para schema: nueva migración numerada (siguiente número), idempotente, recreate views si afecta columnas usadas.
- Para permisos: agregar al catálogo + migración + `can()` en código (3 sitios).
- Para deploy: cada PR a main → Netlify deploy automático. Si toca SQL, correr la migración en Supabase ANTES de mergear.
- Branch de trabajo: `claude/setup-spa-app-gg5w1` (la designada por el harness; force-push con lease después de cada PR mergeado).
