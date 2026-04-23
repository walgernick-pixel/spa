-- ============================================================
-- CashFlow Spa · 16 · Cascade delete de turnos
-- Permite que al borrar un turno se borren en cascada:
-- - ventas del turno
-- - turno_colaboradoras (ya tenía cascade desde 06)
-- - arqueos (ya tenía cascade desde 06)
--
-- Idempotente.
-- ============================================================

-- Actualizar FK ventas.turno_id para ON DELETE CASCADE
-- (solo afecta esta constraint; los demás FKs de ventas quedan igual)
alter table ventas drop constraint if exists ventas_turno_id_fkey;
alter table ventas
  add constraint ventas_turno_id_fkey
  foreign key (turno_id) references turnos(id) on delete cascade;

-- VERIFICACIÓN
-- select tc.constraint_name, rc.delete_rule
-- from information_schema.table_constraints tc
-- join information_schema.referential_constraints rc using (constraint_name)
-- where tc.table_name = 'ventas' and tc.constraint_name like '%turno%';
