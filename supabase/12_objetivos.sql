-- ============================================================
-- CashFlow Spa · 12 · Módulo Objetivos
-- Idempotente.
--
-- 3 tipos:
--   venta_spa:        meta venta total · monto fijo o % vs año anterior
--   ticket_spa:       meta ticket promedio del spa · monto fijo
--   bono_individual:  condiciones combinables (ventas, ticket, servicios)
--                     que cualquier terapeuta puede cumplir → bono sugerido
--
-- Periodos: mes | trimestre | anio (calendario natural)
-- Bonos: representativos (no se generan pagos automáticos)
-- ============================================================

create table if not exists objetivos (
  id              uuid primary key default uuid_generate_v4(),
  tipo            text not null check (tipo in ('venta_spa', 'ticket_spa', 'bono_individual')),
  periodo         text not null check (periodo in ('mes', 'trimestre', 'anio')),
  periodo_fecha   date not null,                -- primer día del periodo

  -- venta_spa: modalidad + valor (monto o %)
  meta_modalidad  text check (meta_modalidad in ('monto', 'pct_yoy', null)),
  meta_valor      numeric(12,2),

  -- bono_individual: condiciones (todas opcionales pero ≥1 debe estar)
  cond_ventas_min       numeric(12,2),
  cond_ticket_modalidad text check (cond_ticket_modalidad in ('monto', 'promedio_spa', null)),
  cond_ticket_valor     numeric(12,2),
  cond_ticket_ventana   int,             -- meses para promedio_spa (default 3)
  cond_servicios_min    int,

  -- bono_individual: configuración del bono
  bono_pct        numeric(5,2),
  bono_base       text check (bono_base in ('exceso', 'total', null)),

  descripcion     text,
  activo          boolean not null default true,
  creado          timestamptz not null default now(),
  creado_por      uuid references auth.users(id),
  unique (tipo, periodo, periodo_fecha)         -- 1 objetivo por tipo+periodo
);

create index if not exists objetivos_periodo_idx on objetivos(periodo_fecha desc, activo);
create index if not exists objetivos_tipo_idx    on objetivos(tipo, activo);

-- RLS
alter table objetivos enable row level security;
do $$ begin
  drop policy if exists "acceso_publico" on objetivos;
  create policy "acceso_publico" on objetivos for all to public using (true) with check (true);
end $$;

-- VERIFICACIÓN
-- select count(*) from objetivos;
