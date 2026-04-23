-- ============================================================
-- CashFlow Spa · 14 · Módulo Fiscal
-- Idempotente.
--
-- Modelo:
-- - cuentas.es_fiscal: si la cuenta declara sus ingresos al SAT
-- - gastos.es_facturable: si el gasto tiene factura (IVA acreditable)
-- - config_fiscal: tabla singleton con régimen de la empresa, RFC,
--   ISR %, IVA default
--
-- Propósito: calcular utilidad REAL después de impuestos (estimado,
-- no reemplaza asesoría contable). Visible en Dashboard.
-- ============================================================

-- 1) Cuentas: es_fiscal
alter table cuentas add column if not exists es_fiscal boolean not null default false;

-- 2) Gastos: es_facturable (backfill: si ya tienen IVA, asumir facturable)
alter table gastos add column if not exists es_facturable boolean not null default false;
update gastos set es_facturable = true
  where iva_pct is not null and iva_pct > 0 and es_facturable = false;

-- 3) Config fiscal global (singleton: id siempre = 1)
create table if not exists config_fiscal (
  id              int primary key default 1 check (id = 1),
  nombre_empresa  text,
  rfc             text,
  regimen         text check (regimen in ('resico_pm','rgl','resico_pf','pfae','custom',null)),
  isr_pct         numeric(5,2),         -- tasa ISR a aplicar (ej. 30=general, 1.25=resico)
  iva_pct_default numeric(5,2) default 16,
  activo          boolean default false, -- activar cálculo fiscal en dashboard
  notas           text,
  updated_at      timestamptz default now()
);

-- Insertar fila única si no existe
insert into config_fiscal (id, activo) values (1, false)
on conflict (id) do nothing;

-- RLS
alter table config_fiscal enable row level security;
do $$ begin
  drop policy if exists "acceso_publico" on config_fiscal;
  create policy "acceso_publico" on config_fiscal for all to public using (true) with check (true);
end $$;

-- VERIFICACIÓN
-- select column_name from information_schema.columns
--   where table_name='cuentas' and column_name='es_fiscal';
-- select column_name from information_schema.columns
--   where table_name='gastos' and column_name='es_facturable';
-- select * from config_fiscal;
