-- ============================================================
-- CashFlow Spa · 26 · Patch import abril 2026 (10 y 12 de abril)
-- Idempotente. Sigue el patrón de mig 21.
--
-- Cambios respecto a mig 21:
--   · _imp ahora acepta filas con venta NULL/0 (colabs que
--     estuvieron pero no vendieron) — quedan registradas en
--     turno_colaboradoras pero no generan ventas.
--   · Encargada por fecha: LAU si Laura aparece en alguna fila
--     (aunque sea con 0); en caso contrario, Wal.
-- ============================================================

create temp table _imp on commit drop as
select * from (values
  -- 10/04 — Laura aparece (en 0) → encargada LAU
  ('2026-04-10'::date, 'EDITH',  'MASAJE', 'USD',    700::numeric, 280::numeric, NULL::numeric, 40::numeric),
  ('2026-04-10', 'CRIS',   'MASAJE', 'USD',    800, 320, NULL, 40),
  ('2026-04-10', 'CRIS',   'MASAJE', 'USD',    800, 320, NULL, 40),
  ('2026-04-10', 'TOMI',   'MASAJE', 'MXN',    700, 350, NULL, 50),
  ('2026-04-10', 'CARLOS', NULL,     NULL,     NULL, NULL, NULL, NULL),
  ('2026-04-10', 'MARI',   'MASAJE', 'LAURA',  600, 240, NULL, 40),
  ('2026-04-10', 'LAURA',  NULL,     NULL,     NULL, NULL, NULL, NULL),
  ('2026-04-10', 'AMALIA', NULL,     NULL,     NULL, NULL, NULL, NULL),
  ('2026-04-10', 'RITA',   'MASAJE', 'MXN',    800, 320, NULL, 40),
  ('2026-04-10', 'ELISEO', NULL,     NULL,     NULL, NULL, NULL, NULL),
  -- 12/04 — Laura NO aparece → encargada Wal
  ('2026-04-12', 'PELE',   'MASAJE', 'MXN',    700, 280, NULL, 40),
  ('2026-04-12', 'CARLOS', 'MASAJE', 'MXN',    500, 200, NULL, 40),
  ('2026-04-12', 'CARLOS', 'MASAJE', 'LAURA',  700, 280, NULL, 40),
  ('2026-04-12', 'EDITH',  'MASAJE', 'LAURA',  700, 280, NULL, 40),
  ('2026-04-12', 'TOMI',   'MASAJE', 'MXN',    700, 350, NULL, 50),
  ('2026-04-12', 'MARI',   NULL,     NULL,     NULL, NULL, NULL, NULL),
  ('2026-04-12', 'CRIS',   'MASAJE', 'MXN',    800, 320, NULL, 40),
  ('2026-04-12', 'ELISEO', 'MASAJE', 'MXN',   1200, 480, NULL, 40)
) as t(fecha, colab, tipo, fpago, venta, comision, descuento, pct);

-- ─────────────────────────────────────────────────────────────
-- 1) Mapeos
-- ─────────────────────────────────────────────────────────────
create temp table _map_colab on commit drop as
select upper(coalesce(c.alias, c.nombre)) as excel_name, c.id as colaboradora_id
  from colaboradoras c where c.activo = true;
insert into _map_colab (excel_name, colaboradora_id)
select 'MARI', id from colaboradoras where alias = 'Mary' and activo = true;

create temp table _map_cuenta on commit drop as
select * from (values
  ('MXN',   '515758be-2646-487d-bdaa-9864860d6c13'::uuid, 'MXN', 1::numeric),
  ('USD',   '5a178771-9aab-4f7b-a81c-b504c5866928'::uuid, 'USD', 20::numeric),
  ('LAURA', '03c07089-f8a8-4dcd-8e98-1f026305cefe'::uuid, 'MXN', 1::numeric)  -- HSBC LAURA
) as t(fpago, cuenta_id, moneda, tc);

create temp table _map_servicio on commit drop as
select * from (values
  ('MASAJE', '3c58ad30-a172-4bd6-a28d-1cdbb20c1f8d'::uuid)
) as t(tipo, servicio_id);

-- ─────────────────────────────────────────────────────────────
-- 2) Validar colaboradoras
-- ─────────────────────────────────────────────────────────────
do $$
declare v_missing text;
begin
  select string_agg(distinct i.colab, ', ') into v_missing
    from _imp i left join _map_colab m on m.excel_name = i.colab
   where m.excel_name is null;
  if v_missing is not null then
    raise exception 'Colaboradoras no encontradas: %', v_missing;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3) Crear turnos (uno por fecha). Encargada = LAU si Laura
--    aparece en alguna fila (aunque sea con 0); si no, Wal.
--    Idempotente vía WHERE NOT EXISTS.
-- ─────────────────────────────────────────────────────────────
with encargada_por_fecha as (
  select
    d.fecha,
    case when exists (
      select 1 from _imp i where i.fecha = d.fecha and i.colab = 'LAURA'
    )
    then '4064d54a-089b-444f-86d8-96bf3c72766e'::uuid  -- LAU
    else '85133c85-7c94-4e9d-a33f-5dc9a7de900b'::uuid  -- Wal
    end as encargada_id
  from (select distinct fecha from _imp) d
)
insert into turnos (fecha, hora_inicio, hora_fin, encargada_id, abierto_por, estado, notas, cerrado)
select
  e.fecha, '09:00'::time, '17:00'::time,
  e.encargada_id, e.encargada_id,  -- mismo abierto_por (mig 24)
  'cerrado',
  '[IMPORT_PATCH_ABR2026_10_12]',
  e.fecha + time '17:00'
from encargada_por_fecha e
where not exists (
  select 1 from turnos t2
   where t2.fecha = e.fecha
     and t2.notas like '%[IMPORT_PATCH_ABR2026_10_12]%'
);

-- ─────────────────────────────────────────────────────────────
-- 4) turno_colaboradoras — solo personas con ventas (las de 0
--    no aportan a comisiones; el conteo de presencia se infiere
--    de las ventas en sí). La presencia de Laura aún se usa
--    arriba para definir encargada, aunque ella misma no se
--    inserte en turno_colaboradoras si no tiene ventas.
-- ─────────────────────────────────────────────────────────────
insert into turno_colaboradoras (turno_id, colaboradora_id, comision_pagada_at)
select distinct
  t.id, m.colaboradora_id, t.fecha + time '17:00'
from turnos t
join _imp i on i.fecha = t.fecha and i.venta is not null and i.venta > 0
join _map_colab m on m.excel_name = i.colab
where t.notas like '%[IMPORT_PATCH_ABR2026_10_12]%'
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────
-- 5) Insertar ventas (solo filas con venta > 0)
-- ─────────────────────────────────────────────────────────────
with ventas_norm as (
  select
    i.*,
    case
      when i.tipo = 'FISH SPA' then 'caja'
      when i.pct is null or i.pct = 0 then 'caja'
      when i.pct < 45 then 'rol'
      when i.pct < 56 then 'modulo'
      else 'hotel'
    end as canal_id,
    case
      when i.tipo = 'FISH SPA' then 0
      when i.pct is null or i.pct = 0 then 0
      when i.pct < 45 then 40
      when i.pct < 56 then 50
      else 60
    end as canal_pct,
    mc.cuenta_id, mc.moneda, mc.tc,
    case when mc.moneda in ('USD','CAD') then i.venta / mc.tc else i.venta end as precio_nat,
    case when mc.moneda in ('USD','CAD') then coalesce(i.descuento, 0) / mc.tc else coalesce(i.descuento, 0) end as descuento_nat,
    ms.servicio_id, mco.colaboradora_id
  from _imp i
  join _map_cuenta   mc  on mc.fpago = i.fpago
  join _map_servicio ms  on ms.tipo = i.tipo
  join _map_colab    mco on mco.excel_name = i.colab
  where i.venta is not null and i.venta > 0
)
insert into ventas (
  turno_id, fecha, servicio_id, colaboradora_id, canal_id, cuenta_id,
  precio, descuento, comision_pct, comision_monto, propina,
  moneda, tc_momento, creado_por, creado
)
select
  t.id, v.fecha, v.servicio_id, v.colaboradora_id, v.canal_id, v.cuenta_id,
  v.precio_nat, v.descuento_nat, v.canal_pct,
  v.precio_nat * v.canal_pct / 100, 0,
  v.moneda, v.tc,
  '85133c85-7c94-4e9d-a33f-5dc9a7de900b'::uuid,  -- creado_por: Wal
  v.fecha + time '12:00'
from ventas_norm v
join turnos t on t.fecha = v.fecha and t.notas like '%[IMPORT_PATCH_ABR2026_10_12]%'
where not exists (select 1 from ventas vx where vx.turno_id = t.id);

-- ─────────────────────────────────────────────────────────────
-- 6) venta_pagos
-- ─────────────────────────────────────────────────────────────
insert into venta_pagos (venta_id, cuenta_id, tipo, monto, descuento, orden)
select v.id, v.cuenta_id, 'servicio', v.precio, coalesce(v.descuento, 0), 0
from ventas v
join turnos t on t.id = v.turno_id
where t.notas like '%[IMPORT_PATCH_ABR2026_10_12]%'
  and not exists (select 1 from venta_pagos vp where vp.venta_id = v.id);

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- Turnos creados (debe ser 2):
-- select fecha, encargada_id from turnos where notas like '%[IMPORT_PATCH_ABR2026_10_12]%';
--
-- Ventas por fecha (esperado: 6 + 7 = 13):
-- select fecha, count(*) from v_ventas
--   where fecha in ('2026-04-10','2026-04-12') group by fecha order by fecha;
--
-- Personal que estuvo en cada turno (esperado: 9 + 7 = 16, dependiendo
-- de cuántos colabs únicos hay por día):
-- select t.fecha, count(*) from turno_colaboradoras tc
--   join turnos t on t.id = tc.turno_id
--   where t.notas like '%[IMPORT_PATCH_ABR2026_10_12]%'
--   group by t.fecha order by t.fecha;
