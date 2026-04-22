-- ============================================================
-- CashFlow Spa · 11 · Arqueo por CUENTA (no solo por moneda) + reaperturas
-- Idempotente.
--
-- Cambios:
-- 1) arqueos.cuenta_id   → ahora se arquea cada cuenta
--    (efectivo, terminal, banco). Antes era por moneda.
-- 2) UNIQUE (turno_id, cuenta_id) — permite múltiples cuentas
--    en la misma moneda (ej. Clip MXN + Efectivo MXN por separado)
-- 3) turnos.reaperturas   → contador de veces reabierto
-- 4) turnos.reabierto_at  → timestamp de la última reapertura
-- ============================================================

-- ────────────────────────────────────────────
-- 1) ARQUEOS: nueva columna cuenta_id
-- ────────────────────────────────────────────
alter table arqueos add column if not exists cuenta_id uuid references cuentas(id);
create index if not exists arqueos_cuenta_idx on arqueos(cuenta_id);

-- Backfill best-effort: si existe un arqueo (turno_id, moneda) y solo hay 1 cuenta
-- efectivo de esa moneda con ventas en el turno, asigna esa cuenta al arqueo.
-- (si hay duplicados, queda null y el usuario re-captura)
update arqueos a
set cuenta_id = sub.cuenta_id
from (
  select distinct on (v.turno_id, v.moneda, c.tipo)
         v.turno_id, v.moneda, c.tipo, v.cuenta_id
  from ventas v
  join cuentas c on c.id = v.cuenta_id
  where v.eliminado is null and c.tipo = 'efectivo'
) sub
where a.turno_id = sub.turno_id and a.moneda = sub.moneda
  and a.cuenta_id is null;

-- Cambiar UNIQUE de (turno_id, moneda) a (turno_id, cuenta_id)
-- El nombre del constraint auto-generado es 'arqueos_turno_id_moneda_key'
alter table arqueos drop constraint if exists arqueos_turno_id_moneda_key;
-- Por si quedó con otro nombre:
do $$
declare r record;
begin
  for r in
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
    where tc.table_name='arqueos' and tc.constraint_type='UNIQUE'
  loop
    execute format('alter table arqueos drop constraint %I', r.constraint_name);
  end loop;
end $$;

-- Nuevo UNIQUE constraint real (no índice parcial — ON CONFLICT necesita
-- un constraint real o un índice SIN predicados).
alter table arqueos drop constraint if exists arqueos_turno_cuenta_uq;
drop index  if exists arqueos_turno_cuenta_uq;
alter table arqueos add constraint arqueos_turno_cuenta_uq unique (turno_id, cuenta_id);

-- ────────────────────────────────────────────
-- 2) TURNOS: reaperturas + reabierto_at
-- ────────────────────────────────────────────
alter table turnos add column if not exists reaperturas   int not null default 0;
alter table turnos add column if not exists reabierto_at  timestamptz;

-- ────────────────────────────────────────────
-- 3) Recrear v_turnos_resumen con las columnas nuevas
-- ────────────────────────────────────────────
drop view if exists v_turnos_resumen;

create view v_turnos_resumen as
select t.id, t.folio, t.fecha, t.hora_inicio, t.hora_fin, t.estado,
  t.encargada_id, ua.nombre as encargada_nombre,
  t.creado, t.cerrado, t.notas,
  t.reaperturas, t.reabierto_at,
  coalesce(sum(v.precio * v.tc_momento), 0)                                        as total_mxn,
  coalesce(sum(v.comision_monto * v.tc_momento), 0)                                as comisiones_mxn,
  coalesce(sum(coalesce(v.comision_venta_monto,0) * v.tc_momento), 0)              as comisiones_venta_mxn,
  coalesce(sum(v.propina * v.tc_momento), 0)                                       as propinas_mxn,
  count(v.id)                                                                      as n_servicios,
  (select count(*) from turno_colaboradoras tc where tc.turno_id = t.id)           as n_colaboradoras,
  (select count(*) from turno_colaboradoras tc where tc.turno_id = t.id
    and tc.comision_pagada_at is null)                                             as n_pagos_pendientes
from turnos t
left join usuarios_admin ua on ua.id = t.encargada_id
left join ventas v on v.turno_id = t.id and v.eliminado is null
group by t.id, ua.nombre;

-- ────────────────────────────────────────────
-- VERIFICACIÓN
-- ────────────────────────────────────────────
-- select column_name from information_schema.columns
--   where table_name='arqueos' and column_name='cuenta_id';
-- select column_name from information_schema.columns
--   where table_name='turnos' and column_name in ('reaperturas','reabierto_at');
-- select column_name from information_schema.columns
--   where table_name='v_turnos_resumen' and column_name in ('reaperturas','reabierto_at');
