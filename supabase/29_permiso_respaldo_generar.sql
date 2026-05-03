-- ============================================================
-- CashFlow Spa · 29 · Permiso respaldo_generar
-- Permiso único para generar respaldo (exporta toda la base a JSON).
-- Función administrativa: por default sólo admin.
--
-- Idempotente.
-- ============================================================

-- 1) Admin: forzado a true (trigger lo coerce).
update roles
   set permisos = permisos || '{"respaldo_generar": true}'::jsonb
 where clave = 'admin';

-- 2) Cualquier otro rol: agregar la clave en false si no la tiene.
--    No abrimos acceso silenciosamente; el owner lo prende a quien quiera.
update roles
   set permisos = permisos || '{"respaldo_generar": false}'::jsonb
 where clave <> 'admin'
   and not (permisos ? 'respaldo_generar');

-- VERIFICACIÓN
-- select clave, permisos->'respaldo_generar' from roles;
