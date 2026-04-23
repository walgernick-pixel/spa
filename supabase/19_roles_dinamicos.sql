-- ============================================================
-- CashFlow Spa · 19 · Roles dinámicos con permisos configurables
-- Sustituye los 2 roles hardcoded (admin/encargada) por una tabla
-- `roles` con permisos JSONB. Los admins crean/editan roles desde
-- la app y togglean permisos granulares.
--
-- Catálogo de 38 permisos agrupados en 7 módulos (ver README).
-- Idempotente.
-- ============================================================

-- 1) Tabla roles
create table if not exists roles (
  clave        text primary key,
  nombre       text not null,
  descripcion  text,
  protegido    boolean not null default false,
  permisos     jsonb not null default '{}'::jsonb,
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);

-- 2) Seed: admin (protegido · TODO) y encargada (operación diaria)
insert into roles (clave, nombre, descripcion, protegido, permisos) values
  ('admin', 'Administrador', 'Acceso total al sistema. Protegido — no se puede borrar ni modificar permisos.', true, '{
    "pv_abrir_turno": true, "pv_cerrar_turno": true, "pv_registrar_venta": true, "pv_firmar_cobro": true, "pv_pagar_comis": true,
    "turnos_ver_cerrados": true, "turnos_reabrir": true, "turnos_editar_cerrado": true, "turnos_eliminar": true, "arqueo_eliminar": true,
    "gastos_ver": true, "gastos_crear": true, "gastos_editar": true, "gastos_eliminar": true, "gastos_marcar_pagado": true, "gastos_exportar": true,
    "dashboard_ver": true, "dashboard_ver_fiscal": true, "dashboard_ver_utilidad": true, "dashboard_ver_rankings": true, "dashboard_exportar": true,
    "objetivos_ver": true, "objetivos_crear": true, "objetivos_editar": true, "objetivos_eliminar": true,
    "fiscal_ver_config": true, "fiscal_editar_config": true,
    "config_cuentas_ver": true, "config_cuentas_editar": true,
    "config_catalogo_ver": true, "config_catalogo_editar": true,
    "config_servicios_ver": true, "config_servicios_editar": true,
    "config_colab_ver": true, "config_colab_editar": true,
    "usuarios_ver": true, "usuarios_gestionar": true, "roles_gestionar": true
  }'::jsonb),
  ('encargada', 'Encargada', 'Operación diaria: punto de venta y captura de gastos.', false, '{
    "pv_abrir_turno": true, "pv_cerrar_turno": true, "pv_registrar_venta": true, "pv_firmar_cobro": true, "pv_pagar_comis": true,
    "turnos_ver_cerrados": false, "turnos_reabrir": false, "turnos_editar_cerrado": false, "turnos_eliminar": false, "arqueo_eliminar": false,
    "gastos_ver": true, "gastos_crear": true, "gastos_editar": false, "gastos_eliminar": false, "gastos_marcar_pagado": false, "gastos_exportar": false,
    "dashboard_ver": false, "dashboard_ver_fiscal": false, "dashboard_ver_utilidad": false, "dashboard_ver_rankings": false, "dashboard_exportar": false,
    "objetivos_ver": false, "objetivos_crear": false, "objetivos_editar": false, "objetivos_eliminar": false,
    "fiscal_ver_config": false, "fiscal_editar_config": false,
    "config_cuentas_ver": true, "config_cuentas_editar": false,
    "config_catalogo_ver": true, "config_catalogo_editar": false,
    "config_servicios_ver": true, "config_servicios_editar": false,
    "config_colab_ver": true, "config_colab_editar": false,
    "usuarios_ver": false, "usuarios_gestionar": false, "roles_gestionar": false
  }'::jsonb)
on conflict (clave) do nothing;

-- 3) Garantizar que admin SIEMPRE tenga todos los permisos en true
--    (por si agregamos permisos nuevos en el futuro, admin los hereda).
--    Si se corre el SQL re-seed, esto reimpone permisos.
update roles set permisos = permisos || '{
  "pv_abrir_turno": true, "pv_cerrar_turno": true, "pv_registrar_venta": true, "pv_firmar_cobro": true, "pv_pagar_comis": true,
  "turnos_ver_cerrados": true, "turnos_reabrir": true, "turnos_editar_cerrado": true, "turnos_eliminar": true, "arqueo_eliminar": true,
  "gastos_ver": true, "gastos_crear": true, "gastos_editar": true, "gastos_eliminar": true, "gastos_marcar_pagado": true, "gastos_exportar": true,
  "dashboard_ver": true, "dashboard_ver_fiscal": true, "dashboard_ver_utilidad": true, "dashboard_ver_rankings": true, "dashboard_exportar": true,
  "objetivos_ver": true, "objetivos_crear": true, "objetivos_editar": true, "objetivos_eliminar": true,
  "fiscal_ver_config": true, "fiscal_editar_config": true,
  "config_cuentas_ver": true, "config_cuentas_editar": true,
  "config_catalogo_ver": true, "config_catalogo_editar": true,
  "config_servicios_ver": true, "config_servicios_editar": true,
  "config_colab_ver": true, "config_colab_editar": true,
  "usuarios_ver": true, "usuarios_gestionar": true, "roles_gestionar": true
}'::jsonb where clave = 'admin';

-- 4) FK de perfiles.rol hacia roles.clave (reemplaza el CHECK hardcoded)
alter table perfiles drop constraint if exists perfiles_rol_check;
-- Eliminar FK previa si existía con otro nombre
do $$
declare r record;
begin
  for r in select conname from pg_constraint where conrelid='perfiles'::regclass and contype='f' and pg_get_constraintdef(oid) like '%roles(clave)%' loop
    execute format('alter table perfiles drop constraint %I', r.conname);
  end loop;
end $$;
alter table perfiles add constraint perfiles_rol_fk
  foreign key (rol) references roles(clave) on update cascade on delete restrict;

-- 5) RLS en roles
alter table roles enable row level security;

-- Todos los autenticados pueden leer (para que cada quien sepa sus permisos)
drop policy if exists "roles_leer_todos" on roles;
create policy "roles_leer_todos" on roles
  for select using (true);

-- Solo admins modifican (respaldados por protegido=true en admin)
drop policy if exists "roles_admin_mod" on roles;
create policy "roles_admin_mod" on roles
  for all using (current_rol() = 'admin') with check (current_rol() = 'admin');

-- 6) Trigger: bloquear edición/borrado del rol admin (doble capa de seguridad)
create or replace function roles_proteger_admin()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'DELETE' and old.protegido) then
    raise exception 'No se puede borrar un rol protegido (%)', old.clave;
  end if;
  if (TG_OP = 'UPDATE' and old.protegido) then
    -- Permitir actualizar nombre/descripcion pero no permisos ni clave ni protegido
    if old.clave <> new.clave then
      raise exception 'No se puede cambiar la clave de un rol protegido';
    end if;
    if old.protegido <> new.protegido then
      raise exception 'No se puede quitar el estado protegido';
    end if;
    if old.permisos <> new.permisos then
      raise exception 'No se pueden modificar los permisos del rol admin (siempre tiene todos)';
    end if;
  end if;
  if (TG_OP = 'UPDATE') then
    new.actualizado := now();
  end if;
  return case when TG_OP = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists roles_proteger on roles;
create trigger roles_proteger
  before update or delete on roles
  for each row execute function roles_proteger_admin();

-- 7) Helper: permisos del usuario actual (para RLS en otras tablas)
create or replace function tiene_permiso(p_permiso text)
returns boolean language sql stable as $$
  select coalesce((
    select (r.permisos->p_permiso)::boolean
    from perfiles p join roles r on r.clave = p.rol
    where p.id = auth.uid() and p.activo
  ), false);
$$;

-- VERIFICACIÓN
-- select clave, nombre, protegido, jsonb_object_keys(permisos) from roles;
-- select clave, (select count(*) from jsonb_object_keys(permisos)) as total_permisos,
--        (select count(*) from jsonb_each(permisos) where value::text='true') as activos
--   from roles;
