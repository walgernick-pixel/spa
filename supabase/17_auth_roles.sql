-- ============================================================
-- CashFlow Spa · 17 · Auth + Roles
-- Tabla perfiles linked to auth.users + trigger auto-crea perfil
-- Roles: admin (dueño/gerencia) | encargada (operación)
-- Idempotente.
-- ============================================================

-- 1) Tabla perfiles
create table if not exists perfiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  nombre_display  text not null,
  rol             text not null default 'encargada' check (rol in ('admin', 'encargada')),
  colaboradora_id uuid references colaboradoras(id) on delete set null, -- linka al perfil operativo (opcional)
  activo          boolean not null default true,
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now()
);

create index if not exists perfiles_rol_idx    on perfiles(rol, activo);
create index if not exists perfiles_email_idx  on perfiles(email);

-- 2) Trigger para auto-crear perfil al signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into perfiles (id, email, nombre_display, rol)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre_display', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'rol', 'encargada')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3) Helper function: rol del usuario actual
create or replace function current_rol()
returns text
language sql
stable
as $$
  select rol from perfiles where id = auth.uid();
$$;

-- 4) RLS
alter table perfiles enable row level security;

drop policy if exists "perfiles_ver_propio" on perfiles;
create policy "perfiles_ver_propio" on perfiles
  for select using (id = auth.uid());

drop policy if exists "perfiles_admin_ver" on perfiles;
create policy "perfiles_admin_ver" on perfiles
  for select using (current_rol() = 'admin');

drop policy if exists "perfiles_admin_mod" on perfiles;
create policy "perfiles_admin_mod" on perfiles
  for all using (current_rol() = 'admin') with check (current_rol() = 'admin');

-- 5) Dar acceso anónimo temporal mientras se implementa login
--    Cuando todos los usuarios tengan perfil, se quita esta política.
--    Por ahora: si no hay sesión, se permite leer (así la app sigue funcionando
--    para los que aún no se logean).
drop policy if exists "perfiles_anon_leer" on perfiles;
create policy "perfiles_anon_leer" on perfiles
  for select to anon using (true);

-- VERIFICACIÓN
-- select * from perfiles;
-- select current_rol();
