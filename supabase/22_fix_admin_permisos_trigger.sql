-- ============================================================
-- CashFlow Spa · 22 · Fix trigger de protección del rol admin
-- Idempotente.
--
-- Problema:
--   El trigger roles_proteger_admin() (mig. 19) levantaba excepción
--   ante CUALQUIER cambio en admin.permisos, lo cual rompía el flujo
--   documentado en CLAUDE.md para agregar permisos nuevos:
--     update roles set permisos = permisos || '{"nuevo_slug": true}'
--      where clave = 'admin';
--   → ERROR P0001: No se pueden modificar permisos del admin
--
-- Fix:
--   Reemplazar la verificación rígida por una coerción idempotente.
--   En UPDATE sobre un rol protegido, el trigger ahora:
--     · permite la actualización de permisos,
--     · pero fuerza new.permisos a contener TODAS las claves de
--       old.permisos UNIDAS con las claves de new.permisos, todas en
--       true. Así admin nunca pierde un permiso ni queda en false.
--   Sigue bloqueando cambios de `clave`, `protegido` y DELETE.
-- ============================================================

create or replace function roles_proteger_admin()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'DELETE' and old.protegido) then
    raise exception 'No se puede borrar un rol protegido (%)', old.clave;
  end if;

  if (TG_OP = 'UPDATE' and old.protegido) then
    if old.clave <> new.clave then
      raise exception 'No se puede cambiar la clave de un rol protegido';
    end if;
    if old.protegido <> new.protegido then
      raise exception 'No se puede quitar el estado protegido';
    end if;
    -- Coerción: admin siempre tiene TODOS los permisos en true.
    -- Unimos las claves viejas y nuevas y forzamos cada valor a true.
    -- Esto permite agregar permisos nuevos vía migraciones sin que el
    -- trigger levante excepción, y a la vez impide bajar un permiso.
    new.permisos := coalesce((
      select jsonb_object_agg(k, to_jsonb(true))
      from (
        select jsonb_object_keys(old.permisos) as k
        union
        select jsonb_object_keys(coalesce(new.permisos, '{}'::jsonb))
      ) keys
    ), '{}'::jsonb);
  end if;

  if (TG_OP = 'UPDATE') then
    new.actualizado := now();
  end if;

  return case when TG_OP = 'DELETE' then old else new end;
end;
$$;

-- El trigger ya existe (creado en mig. 19); CREATE OR REPLACE de la
-- función basta. Recreamos el trigger por si la mig. 19 no se corrió.
drop trigger if exists roles_proteger on roles;
create trigger roles_proteger
  before update or delete on roles
  for each row execute function roles_proteger_admin();

-- VERIFICACIÓN
-- Re-correr el bootstrap de permisos del admin (no debe fallar):
--   update roles set permisos = permisos || '{"pv_abrir_turno": true}'::jsonb
--    where clave = 'admin';
-- Intentar bajar un permiso (queda forzado a true por el trigger):
--   update roles set permisos = permisos || '{"pv_abrir_turno": false}'::jsonb
--    where clave = 'admin';
--   select permisos->'pv_abrir_turno' from roles where clave='admin'; -- true
-- Intentar cambiar clave/protegido (sigue fallando):
--   update roles set protegido = false where clave = 'admin'; -- error
