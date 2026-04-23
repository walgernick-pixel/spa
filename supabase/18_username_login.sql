-- ============================================================
-- CashFlow Spa · 18 · Login por usuario (sin email real)
-- Las encargadas no tienen correo. El admin crea usuarios con un
-- "username" (lupita, rosa...). Internamente se guarda como
-- username@xcalacoco.local en auth.users.
-- Idempotente.
-- ============================================================

-- 1) Agregar columna username a perfiles
alter table perfiles
  add column if not exists username text;

-- Poblar username de los perfiles existentes (desde el email antes del @)
update perfiles
   set username = lower(split_part(email, '@', 1))
 where username is null;

-- Validaciones y unicidad
create unique index if not exists perfiles_username_uq on perfiles(lower(username));
alter table perfiles
  alter column username set not null;

-- 2) Actualizar trigger handle_new_user para guardar username
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  v_username text;
begin
  -- username viene de raw_user_meta_data, o del email antes del @
  v_username := coalesce(
    lower(trim(new.raw_user_meta_data->>'username')),
    lower(split_part(new.email, '@', 1))
  );

  insert into perfiles (id, email, username, nombre_display, rol)
  values (
    new.id,
    new.email,
    v_username,
    coalesce(new.raw_user_meta_data->>'nombre_display', v_username),
    coalesce(new.raw_user_meta_data->>'rol', 'encargada')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3) Política: admins pueden gestionar perfiles (actualizar nombre/rol/activo)
--    Ya existe perfiles_admin_mod desde 17_auth_roles.sql, pero reforzamos.
drop policy if exists "perfiles_admin_mod" on perfiles;
create policy "perfiles_admin_mod" on perfiles
  for all using (current_rol() = 'admin') with check (current_rol() = 'admin');

-- 4) Helper: lookup de perfil por username (útil en Edge Function)
create or replace function perfil_por_username(p_username text)
returns perfiles
language sql
stable
as $$
  select * from perfiles where lower(username) = lower(p_username) limit 1;
$$;

-- VERIFICACIÓN
-- select id, username, email, nombre_display, rol, activo from perfiles order by creado;
