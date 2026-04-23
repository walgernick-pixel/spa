-- ============================================================
-- CashFlow Spa · 15 · Fiscal v2 (IVA manual + v_gastos actualizada)
-- Idempotente.
-- ============================================================

-- 1) gastos.iva_monto: override manual del IVA calculado por %
--    Se usa cuando una factura tiene productos mixtos (algunos con
--    IVA, otros sin) y el monto IVA no es 16% × total.
alter table gastos add column if not exists iva_monto numeric(12,2);

-- 2) Recrear v_gastos con los nuevos campos (es_facturable + iva_monto)
--    y soporte para IVA manual en el cálculo de subtotal/iva_importe/iva_pct
drop view if exists v_gastos;

create view v_gastos as
select
  g.id,
  g.folio,
  g.fecha,
  c.label       as concepto,
  c.id          as concepto_id,
  cat.id        as categoria_id,
  cat.label     as categoria,
  cat.tone      as categoria_tone,
  g.proveedor,
  cu.label      as cuenta,
  cu.id         as cuenta_id,
  cu.tipo       as cuenta_tipo,
  g.moneda,
  g.monto,
  -- Si hay iva_monto manual, sobreescribe; si no, usa los generados por iva_pct
  case when g.iva_monto is not null then g.monto - g.iva_monto else g.subtotal end as subtotal,
  case
    when g.iva_monto is not null and (g.monto - g.iva_monto) > 0
      then round(g.iva_monto / (g.monto - g.iva_monto) * 100, 2)
    else g.iva_pct
  end as iva_pct,
  case when g.iva_monto is not null then g.iva_monto else g.iva_importe end as iva_importe,
  g.iva_monto,          -- NUEVO: exponer para saber si fue manual
  g.es_facturable,      -- NUEVO: flag facturable
  g.tc_momento,
  g.monto_mxn,
  g.descripcion,
  g.notas,
  g.comprobante_url,
  g.creado,
  g.editado,
  g.eliminado,
  (select count(*) from gasto_pagos gp where gp.gasto_id = g.id) as n_pagos
from gastos g
join conceptos_gasto c on c.id = g.concepto_id
join categorias_gasto cat on cat.id = c.categoria
join cuentas cu on cu.id = g.cuenta_id
where g.eliminado is null;

-- VERIFICACIÓN
-- select column_name from information_schema.columns
--   where table_name='gastos' and column_name='iva_monto';
-- select column_name from information_schema.columns
--   where table_name='v_gastos' and column_name in ('es_facturable','iva_monto');
