-- ──────────────────────────────────────────────────────────────────
-- Migración 28: Relajar índice único de turno abierto a "uno por fecha"
-- ──────────────────────────────────────────────────────────────────
-- La migración 27 creó un índice único parcial sobre (estado) where
-- estado='abierto'. Eso bloqueaba tener cualquier otro turno abierto
-- en toda la base, lo que impedía capturar cortes pasados (retroactivos)
-- mientras hubiera un turno abierto del día de hoy.
--
-- Regla nueva: solo puede haber UN turno abierto por fecha. Sí se
-- pueden tener varios abiertos simultáneamente, siempre que sean de
-- fechas distintas (caso típico: turno de hoy abierto + captura de
-- un corte pasado pendiente de cerrar).
--
-- Idempotente: drop + recreate.
-- ──────────────────────────────────────────────────────────────────

drop index if exists turnos_un_solo_abierto_idx;

create unique index if not exists turnos_un_solo_abierto_por_fecha_idx
  on turnos (fecha, estado)
  where estado = 'abierto';

-- Verificación (manual):
--   select indexname, indexdef from pg_indexes
--   where tablename='turnos' and indexname like 'turnos_un_solo_abierto%';
