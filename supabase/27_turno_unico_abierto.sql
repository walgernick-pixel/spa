-- ──────────────────────────────────────────────────────────────────
-- Migración 27: Unique partial index para garantizar 1 turno abierto
-- ──────────────────────────────────────────────────────────────────
-- Bug: la app permitía crear múltiples turnos con estado='abierto'
-- cuando el usuario hacía clicks rápidos en "Abrir turno" mientras la
-- red iba lenta (race condition cliente-side). El frontend ya tiene
-- un ref-lock; este índice es la red de seguridad server-side.
--
-- Idempotente: usa "if not exists".
--
-- Antes de correr esta migración asegúrate de que NO HAY turnos
-- abiertos duplicados. Ejecuta primero:
--
--   select fecha, count(*) as n from turnos
--   where estado='abierto' group by fecha having count(*) > 1;
--
-- Si hay duplicados, decide cuáles eliminar (los vacíos sin ventas
-- son seguros) o cierra los duplicados antes de aplicar el índice.
-- ──────────────────────────────────────────────────────────────────

create unique index if not exists turnos_un_solo_abierto_idx
  on turnos (estado)
  where estado = 'abierto';

-- Verificación (manual, no ejecutar con la migración):
--   select indexname, indexdef from pg_indexes
--   where tablename='turnos' and indexname='turnos_un_solo_abierto_idx';
