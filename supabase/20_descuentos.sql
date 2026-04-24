-- ============================================================
-- CashFlow Spa · 20 · Descuentos por venta
-- Idempotente.
--
-- Regla de negocio:
--   · La comisión del terapeuta se calcula sobre el precio BRUTO
--     (antes de descuento). El descuento solo reduce lo que el
--     cliente paga y lo que cae en la cuenta.
--   · Propinas siguen siendo independientes (no afectan el corte).
--
-- Cambios:
--   1) ventas.descuento          numeric(10,2) default 0
--   2) venta_pagos.descuento     numeric(10,2) default 0
--      (aplica solo a filas con tipo = 'servicio')
--   3) v_ventas        — expone descuento, descuento_mxn y recalcula
--                        monto_spa = precio - descuento - comision - com_venta
--   4) v_turnos_resumen — expone descuentos_mxn; total_mxn sigue
--                         siendo BRUTO (consumidores calculan neto)
-- ============================================================

-- ────────────────────────────────────────────
-- 1) Columnas nuevas
-- ────────────────────────────────────────────
alter table ventas       add column if not exists descuento numeric(10,2) not null default 0;
alter table venta_pagos  add column if not exists descuento numeric(10,2) not null default 0;

-- ────────────────────────────────────────────
-- 2) Recrear v_ventas
-- ────────────────────────────────────────────
drop view if exists v_turnos_resumen;
drop view if exists v_ventas;

create view v_ventas as
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
  v.descuento,
  v.duracion_min,
  v.comision_pct,
  v.comision_monto,
  v.comision_venta_pct,
  v.comision_venta_monto,
  (v.precio - v.descuento - v.comision_monto - coalesce(v.comision_venta_monto,0))                as monto_spa,
  v.propina,
  v.moneda,
  v.tc_momento,
  (v.precio         * v.tc_momento)                                                                as precio_mxn,
  (v.descuento      * v.tc_momento)                                                                as descuento_mxn,
  (v.comision_monto * v.tc_momento)                                                                as comision_mxn,
  (coalesce(v.comision_venta_monto,0) * v.tc_momento)                                              as comision_venta_mxn,
  ((v.precio - v.descuento - v.comision_monto - coalesce(v.comision_venta_monto,0)) * v.tc_momento) as monto_spa_mxn,
  (v.propina * v.tc_momento)                                                                       as propina_mxn,
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
-- 3) Recrear v_turnos_resumen (añade descuentos_mxn)
-- ────────────────────────────────────────────
create view v_turnos_resumen as
select t.id, t.folio, t.fecha, t.hora_inicio, t.hora_fin, t.estado,
  t.encargada_id, ua.nombre as encargada_nombre,
  t.creado, t.cerrado, t.notas,
  t.reaperturas, t.reabierto_at,
  coalesce(sum(v.precio * v.tc_momento), 0)                                        as total_mxn,
  coalesce(sum(v.descuento * v.tc_momento), 0)                                     as descuentos_mxn,
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
--   where table_name='ventas' and column_name='descuento';
-- select column_name from information_schema.columns
--   where table_name='venta_pagos' and column_name='descuento';
-- select column_name from information_schema.columns
--   where table_name='v_ventas' and column_name in ('descuento','descuento_mxn');
-- select column_name from information_schema.columns
--   where table_name='v_turnos_resumen' and column_name='descuentos_mxn';
