-- ============================================================
-- CashFlow Spa · 08 · Campo RFC para colaboradoras
-- Idempotente. Correr DESPUÉS de 03_schema_resto.sql.
-- ============================================================

alter table colaboradoras add column if not exists rfc text;
create index if not exists colaboradoras_rfc_idx on colaboradoras(rfc) where rfc is not null;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- select column_name from information_schema.columns
--   where table_name='colaboradoras' and column_name='rfc';  -- 1 fila
