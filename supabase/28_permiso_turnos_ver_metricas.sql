-- ============================================================
-- CashFlow Spa · 28 · Permiso turnos_ver_metricas
-- Permiso granular para mostrar/ocultar la barra de métricas en el
-- listado de turnos (Ventas semanales, Servicios, Ticket promedio,
-- Turnos abiertos). Útil para roles operativos como "cajera" que
-- abren/cierran turno pero no deberían ver totales de venta.
--
-- Idempotente: re-correr no daña nada.
-- ============================================================

-- 1) Admin: garantizar que tiene el permiso (trigger lo fuerza a true).
update roles
   set permisos = permisos || '{"turnos_ver_metricas": true}'::jsonb
 where clave = 'admin';

-- 2) Encargada: por default sí ve métricas (operación diaria).
update roles
   set permisos = permisos || '{"turnos_ver_metricas": true}'::jsonb
 where clave = 'encargada'
   and not (permisos ? 'turnos_ver_metricas');

-- 3) Cualquier otro rol existente: agregar la clave en false si no la tiene
--    (no la ponemos en true para no abrir acceso silenciosamente).
update roles
   set permisos = permisos || '{"turnos_ver_metricas": false}'::jsonb
 where clave not in ('admin','encargada')
   and not (permisos ? 'turnos_ver_metricas');

-- VERIFICACIÓN
-- select clave, permisos->'turnos_ver_metricas' from roles;
