-- ============================================================
-- CashFlow Spa · 24 · Separar "Abrió" de "Encargada" en turnos
-- Idempotente.
--
-- Hasta ahora encargada_id guardaba al mismo tiempo:
--   (a) quién hizo click en "Abrir turno"
--   (b) la persona asignada como encargada del turno
-- A petición del dueño, se separan en dos columnas:
--   abierto_por  → siempre quien abrió (auditable, no se edita)
--   encargada_id → asignación; default = abierto_por, editable con
--                  permiso turnos_editar_encargado.
--
-- Cambios:
--   1) turnos.abierto_por uuid → auth.users(id)
--   2) Backfill: abierto_por = encargada_id para turnos previos.
--   3) v_turnos_resumen expone abierto_por + abierto_por_nombre.
--      También cambio el lookup de nombre de usuarios_admin → perfiles
--      (perfiles es la tabla canónica desde la mig 17).
-- ============================================================

-- 1) Nueva columna
alter table turnos add column if not exists abierto_por uuid references auth.users(id);

-- 2) Backfill: para turnos viejos donde no existía la separación,
--    asumimos que quien fue marcado encargada también fue quien abrió.
update turnos set abierto_por = encargada_id
  where abierto_por is null and encargada_id is not null;

-- 3) Recrear v_turnos_resumen con la columna nueva + nombre del que abrió
drop view if exists v_turnos_resumen;

create view v_turnos_resumen as
select t.id, t.folio, t.fecha, t.hora_inicio, t.hora_fin, t.estado,
  t.encargada_id, pe.nombre_display as encargada_nombre,
  t.abierto_por, pa.nombre_display as abierto_por_nombre,
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
left join perfiles pe on pe.id = t.encargada_id
left join perfiles pa on pa.id = t.abierto_por
left join ventas v on v.turno_id = t.id and v.eliminado is null
group by t.id, pe.nombre_display, pa.nombre_display;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- select column_name from information_schema.columns
--   where table_name='turnos' and column_name='abierto_por';
-- select column_name from information_schema.columns
--   where table_name='v_turnos_resumen'
--     and column_name in ('abierto_por','abierto_por_nombre');
-- select id, encargada_id, abierto_por from turnos limit 5;
