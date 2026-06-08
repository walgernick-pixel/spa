-- ============================================================
-- CashFlow Spa · 31 · Confirmación de arqueo en escritorio
-- Cadena de custodia: la encargada cierra y reporta su arqueo; en el
-- escritorio el admin CONFIRMA la recepción del dinero (todas las cuentas).
-- Confirmación simple a nivel turno (quién/cuándo + nota opcional); no
-- re-cuenta. Para corregir montos se reabre el turno (flujo existente).
-- Permiso nuevo: arqueo_confirmar. Idempotente.
-- ============================================================

-- 1) Columnas en turnos
alter table turnos add column if not exists arqueo_confirmado_at    timestamptz;
alter table turnos add column if not exists arqueo_confirmado_por   uuid references auth.users(id);
alter table turnos add column if not exists arqueo_confirmado_notas text;

-- 2) Recrear v_turnos_resumen exponiendo la confirmación + nombre de quien confirmó
drop view if exists v_turnos_resumen;
create view v_turnos_resumen as
select t.id, t.folio, t.fecha, t.hora_inicio, t.hora_fin, t.estado,
  t.encargada_id, pe.nombre_display as encargada_nombre,
  t.abierto_por, pa.nombre_display as abierto_por_nombre,
  t.arqueo_confirmado_at, t.arqueo_confirmado_por,
  pc.nombre_display as arqueo_confirmado_por_nombre, t.arqueo_confirmado_notas,
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
left join perfiles pc on pc.id = t.arqueo_confirmado_por
left join ventas v on v.turno_id = t.id and v.eliminado is null
group by t.id, pe.nombre_display, pa.nombre_display, pc.nombre_display;

-- 3) Permiso arqueo_confirmar (admin true; el trigger de admin también lo fuerza)
update roles set permisos = permisos || '{"arqueo_confirmar": true}'::jsonb where clave = 'admin';
update roles set permisos = permisos || '{"arqueo_confirmar": false}'::jsonb
  where clave <> 'admin' and not (permisos ? 'arqueo_confirmar');

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- select column_name from information_schema.columns
--   where table_name='turnos' and column_name like 'arqueo_confirmado%';
-- select clave, permisos->'arqueo_confirmar' from roles;
