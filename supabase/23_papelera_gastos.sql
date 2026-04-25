-- ============================================================
-- CashFlow Spa · 23 · Papelera de gastos
-- Idempotente. Requiere mig 22 (fix del trigger admin) corrida antes.
--
-- 1) gastos.eliminado_por uuid → quién archivó el gasto
-- 2) Vista v_gastos_eliminados (mirror de v_gastos, eliminado is not null)
-- 3) Permiso roles.permisos.gastos_papelera (admin=true, otros=false)
-- ============================================================

-- ────────────────────────────────────────────
-- 1) Columna eliminado_por
-- ────────────────────────────────────────────
alter table gastos add column if not exists eliminado_por uuid references auth.users(id);

-- ────────────────────────────────────────────
-- 2) Vista v_gastos_eliminados
-- ────────────────────────────────────────────
drop view if exists v_gastos_eliminados;

create view v_gastos_eliminados as
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
  case when g.iva_monto is not null then g.monto - g.iva_monto else g.subtotal end as subtotal,
  case
    when g.iva_monto is not null and (g.monto - g.iva_monto) > 0
      then round(g.iva_monto / (g.monto - g.iva_monto) * 100, 2)
    else g.iva_pct
  end as iva_pct,
  case when g.iva_monto is not null then g.iva_monto else g.iva_importe end as iva_importe,
  g.iva_monto,
  g.es_facturable,
  g.tc_momento,
  g.monto_mxn,
  g.descripcion,
  g.notas,
  g.comprobante_url,
  g.creado,
  g.editado,
  g.eliminado,
  g.eliminado_por,
  (select count(*) from gasto_pagos gp where gp.gasto_id = g.id) as n_pagos
from gastos g
join conceptos_gasto c on c.id = g.concepto_id
join categorias_gasto cat on cat.id = c.categoria
join cuentas cu on cu.id = g.cuenta_id
where g.eliminado is not null;

-- ────────────────────────────────────────────
-- 3) Permiso gastos_papelera
--    (la mig 22 hace que el update sobre admin no falle)
-- ────────────────────────────────────────────
update roles set permisos = permisos || '{"gastos_papelera": true}'::jsonb
  where clave = 'admin';
update roles set permisos = permisos || '{"gastos_papelera": false}'::jsonb
  where clave <> 'admin';

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- select clave, permisos->>'gastos_papelera' from roles;
-- select count(*) from v_gastos_eliminados;
-- select column_name from information_schema.columns
--   where table_name='gastos' and column_name='eliminado_por';
