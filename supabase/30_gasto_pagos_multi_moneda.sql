-- ============================================================
-- CashFlow Spa · 30 · gasto_pagos multi-moneda
-- Agrega `moneda` y `tc_momento` a `gasto_pagos` para soportar splits
-- con cuentas en distintas monedas (caso real: pagar parte en HSBC MXN
-- y parte en cuenta USD en el mismo gasto).
--
-- Antes: la tabla sólo tenía cuenta_id+monto, asumiendo mismo currency.
-- Ahora: cada línea guarda su moneda y TC al momento del registro.
--
-- Idempotente. Backfill desde cuentas+monedas para filas existentes.
-- ============================================================

-- 1) Columnas nullable temporalmente (para backfill).
alter table gasto_pagos add column if not exists moneda text;
alter table gasto_pagos add column if not exists tc_momento numeric;

-- 2) Backfill: el form viejo trataba todos los splits como misma moneda
--    que el gasto principal (gastos.moneda) — ese era el bug, los nuevos
--    splits sí tienen moneda independiente. Para los históricos, copiamos
--    de gastos para que monto_mxn refleje lo capturado realmente.
update gasto_pagos gp
   set moneda = g.moneda,
       tc_momento = g.tc_momento
  from gastos g
 where gp.gasto_id = g.id
   and (gp.moneda is null or gp.tc_momento is null);

-- 3) Enforce NOT NULL ahora que está backfilled.
alter table gasto_pagos alter column moneda set not null;
alter table gasto_pagos alter column tc_momento set not null;
alter table gasto_pagos alter column tc_momento set default 1;

-- 4) Columna generada: monto_mxn por línea.
--    Útil para sumar en el dashboard sin tener que multiplicar a mano.
alter table gasto_pagos drop column if exists monto_mxn;
alter table gasto_pagos add column monto_mxn numeric generated always as (monto * tc_momento) stored;

-- VERIFICACIÓN
-- select cuenta_id, monto, moneda, tc_momento, monto_mxn from gasto_pagos limit 10;
