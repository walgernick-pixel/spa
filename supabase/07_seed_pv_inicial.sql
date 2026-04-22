-- ============================================================
-- CashFlow Spa · Seed inicial del módulo PV
-- Idempotente: puedes correrlo las veces que quieras sin duplicar.
-- Correr DESPUÉS de 06_schema_pv.sql.
-- ============================================================

-- ────────────────────────────────────────────
-- 1) CANALES DE VENTA
--    El % de cada canal es la comisión que recibe el terapeuta.
--    Spa se queda con (100 − %).
-- ────────────────────────────────────────────
insert into canales_venta (id, label, descripcion, comision_default, tone, orden, activo) values
  ('hotel',      'Hotel',      'Venta traída por hoteles asociados',      60.00, 'clay',  1, true),
  ('modulo',     'Módulo',     'Venta directa en el módulo del spa',      50.00, 'moss',  2, true),
  ('restaurant', 'Restaurant', 'Venta traída por restaurantes asociados', 40.00, 'blue',  3, true)
on conflict (id) do update set
  label            = excluded.label,
  descripcion      = excluded.descripcion,
  comision_default = excluded.comision_default,
  tone             = excluded.tone,
  orden            = excluded.orden,
  activo           = excluded.activo;

-- ────────────────────────────────────────────
-- 2) SERVICIOS
--    Catálogo plano. Precio, moneda y duración se definen
--    en el PV al momento de la venta (el `precio_base` es solo sugerido).
-- ────────────────────────────────────────────
insert into servicios (codigo, label, descripcion, duracion_min, precio_base, activo, orden) values
  ('MASAJE',  'Masaje',             'Masaje relajante o terapéutico',    60, 1000, true, 1),
  ('TRENZAS', 'Trenzas',            'Trenzado de cabello',               45,  450, true, 2),
  ('FISHSPA', 'Fish Spa',           'Tratamiento exfoliante con peces',  30,  500, true, 3),
  ('COM_VTA', 'Comisión por venta', 'Monto completo para colaboradora',   0,    0, true, 4)
on conflict (codigo) do update set
  label       = excluded.label,
  descripcion = excluded.descripcion,
  orden       = excluded.orden;

-- ────────────────────────────────────────────
-- VERIFICACIÓN
-- ────────────────────────────────────────────
-- select id, label, comision_default from canales_venta order by orden;
-- select codigo, label, precio_base    from servicios     order by orden;
