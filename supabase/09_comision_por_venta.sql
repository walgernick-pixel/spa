-- ============================================================
-- CashFlow Spa · 09 · Comisión por venta (vendedora ≠ ejecutor)
-- Idempotente. Correr DESPUÉS de 07_seed_pv_inicial.sql.
-- ============================================================

-- ────────────────────────────────────────────
-- 1) CANALES: toggle + % de comisión por venta
-- ────────────────────────────────────────────
alter table canales_venta add column if not exists permite_comision_venta boolean not null default false;
alter table canales_venta add column if not exists comision_venta_pct     numeric(5,2)         default 0;

-- ────────────────────────────────────────────
-- 2) VENTAS: quién vendió + snapshots del %/monto
-- ────────────────────────────────────────────
alter table ventas add column if not exists vendedora_id          uuid references colaboradoras(id) on delete restrict;
alter table ventas add column if not exists comision_venta_pct    numeric(5,2);
alter table ventas add column if not exists comision_venta_monto  numeric(10,2);

create index if not exists ventas_vendedora_idx on ventas(vendedora_id);

-- ────────────────────────────────────────────
-- 3) VISTA v_ventas (actualizada: agrega vendedora + c.venta)
-- ────────────────────────────────────────────
create or replace view v_ventas as
select
  v.id,
  v.folio,
  v.fecha,
  v.turno_id,
  v.servicio_id,          s.label    as servicio,
  v.colaboradora_id,      col.nombre as colaboradora_nombre,
                          col.alias  as colaboradora_alias,
  v.vendedora_id,         vend.nombre as vendedora_nombre,
                          vend.alias  as vendedora_alias,
  v.canal_id,             ca.label   as canal,
                          ca.tone    as canal_tone,
  v.cuenta_id,            cu.label   as cuenta,
                          cu.tipo    as cuenta_tipo,
  v.precio,
  v.duracion_min,
  v.comision_pct,
  v.comision_monto,
  v.comision_venta_pct,
  v.comision_venta_monto,
  (v.precio - v.comision_monto - coalesce(v.comision_venta_monto,0))           as monto_spa,
  v.propina,
  v.moneda,
  v.tc_momento,
  (v.precio         * v.tc_momento)                                              as precio_mxn,
  (v.comision_monto * v.tc_momento)                                              as comision_mxn,
  (coalesce(v.comision_venta_monto,0) * v.tc_momento)                            as comision_venta_mxn,
  ((v.precio - v.comision_monto - coalesce(v.comision_venta_monto,0)) * v.tc_momento) as monto_spa_mxn,
  (v.propina * v.tc_momento)                                                     as propina_mxn,
  v.notas,
  v.creado,
  v.eliminado
from ventas v
left join servicios     s    on s.id    = v.servicio_id
left join colaboradoras col  on col.id  = v.colaboradora_id
left join colaboradoras vend on vend.id = v.vendedora_id
left join canales_venta ca   on ca.id   = v.canal_id
left join cuentas       cu   on cu.id   = v.cuenta_id
where v.eliminado is null;

-- ────────────────────────────────────────────
-- 4) VISTA v_turnos_resumen (actualizada: suma c.venta)
-- ────────────────────────────────────────────
create or replace view v_turnos_resumen as
select
  t.id,
  t.folio,
  t.fecha,
  t.hora_inicio,
  t.hora_fin,
  t.estado,
  t.encargada_id,
  ua.nombre as encargada_nombre,
  t.creado,
  t.cerrado,
  t.notas,
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

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- select column_name from information_schema.columns
--   where table_name='canales_venta' and column_name in ('permite_comision_venta','comision_venta_pct');
-- select column_name from information_schema.columns
--   where table_name='ventas' and column_name in ('vendedora_id','comision_venta_pct','comision_venta_monto');
