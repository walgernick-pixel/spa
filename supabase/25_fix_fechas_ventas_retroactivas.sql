-- ============================================================
-- CashFlow Spa · 25 · Corregir fechas de ventas en turnos retroactivos
-- Idempotente.
--
-- Problema:
--   Al capturar una venta dentro de un turno, el campo ventas.fecha
--   tomaba el default de la columna (current_date), no la fecha del
--   turno al que pertenece. En turnos retroactivos esto deja la venta
--   "en el día de captura" en vez del día real del servicio, lo cual
--   rompe los reportes por rango de fecha en el dashboard.
--
-- Solución:
--   1) Backfill: actualizar ventas existentes para que ventas.fecha
--      coincida con turnos.fecha de su turno padre.
--   2) Trigger: asegurar que cualquier venta nueva siempre se grabe
--      con la fecha del turno al que pertenece (independiente del
--      momento de captura). Esto es defensa en profundidad — el
--      cliente JS ya envía fecha desde mig 25, pero el trigger lo
--      garantiza también para inserts directos en SQL.
-- ============================================================

-- 1) Backfill de fechas mal asignadas
update ventas v
   set fecha = t.fecha
  from turnos t
 where v.turno_id = t.id
   and v.fecha is distinct from t.fecha;

-- 2) Trigger para que ventas.fecha siempre = turnos.fecha al insertar
create or replace function ventas_fecha_de_turno()
returns trigger language plpgsql as $$
declare
  f_turno date;
begin
  if new.turno_id is null then
    return new;
  end if;
  select fecha into f_turno from turnos where id = new.turno_id;
  if f_turno is not null then
    new.fecha := f_turno;
  end if;
  return new;
end;
$$;

drop trigger if exists ventas_fecha_de_turno_t on ventas;
create trigger ventas_fecha_de_turno_t
  before insert or update of turno_id on ventas
  for each row execute function ventas_fecha_de_turno();

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- Cuántas ventas tenían fecha distinta a su turno (debe ser 0 después):
-- select count(*) from ventas v
--   join turnos t on t.id = v.turno_id
--  where v.fecha is distinct from t.fecha;
--
-- Confirmar trigger registrado:
-- select tgname from pg_trigger where tgrelid='ventas'::regclass;
