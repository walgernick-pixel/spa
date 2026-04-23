-- ============================================================
-- CashFlow Spa · 13 · Objetivos v2
-- Agrega: bono_encargada · modalidad monto fijo · base neta
-- Idempotente.
-- ============================================================

-- 1) Ampliar el check de tipo para incluir bono_encargada
alter table objetivos drop constraint if exists objetivos_tipo_check;
alter table objetivos add constraint objetivos_tipo_check
  check (tipo in ('venta_spa', 'ticket_spa', 'bono_individual', 'bono_encargada'));

-- 2) Nueva columna: modalidad del bono (porcentaje o monto fijo)
alter table objetivos add column if not exists bono_modalidad text
  check (bono_modalidad in ('porcentaje', 'monto_fijo', null));

-- 3) Nueva columna: monto fijo del bono (si modalidad=monto_fijo)
alter table objetivos add column if not exists bono_monto_fijo numeric(12,2);

-- 4) Ampliar check de bono_base para incluir 'neta'
alter table objetivos drop constraint if exists objetivos_bono_base_check;
alter table objetivos add constraint objetivos_bono_base_check
  check (bono_base in ('exceso', 'total', 'neta', null));

-- 5) Nueva columna para bono_encargada: mínimo de turnos abiertos
alter table objetivos add column if not exists cond_turnos_min int;

-- Backfill: registros existentes de bono_individual usan modalidad 'porcentaje'
update objetivos set bono_modalidad = 'porcentaje'
  where tipo = 'bono_individual' and bono_modalidad is null and bono_pct is not null;

-- VERIFICACIÓN
-- select column_name from information_schema.columns
--   where table_name='objetivos'
--   and column_name in ('bono_modalidad','bono_monto_fijo','cond_turnos_min');
