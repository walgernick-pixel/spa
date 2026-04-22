-- ============================================================
-- CashFlow Spa · 10 · Firma digital de pagos de comisión
-- Idempotente. Agrega la columna firma_data_url a turno_colaboradoras.
-- La firma se guarda como PNG base64 (data URL) al momento del pago.
-- ============================================================

alter table turno_colaboradoras add column if not exists firma_data_url text;
alter table turno_colaboradoras add column if not exists firmado_at     timestamptz;

-- VERIFICACIÓN
-- select column_name from information_schema.columns
--   where table_name='turno_colaboradoras' and column_name in ('firma_data_url','firmado_at');
