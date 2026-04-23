// ============================================================
// Edge Function: admin-usuarios
// Permite al admin master crear/editar/desactivar usuarios desde la app.
// Seguridad: verifica que el caller es un perfil con rol='admin'.
//
// Actions (POST body):
//   { action:'crear',  username, nombre_display, rol, password }
//   { action:'editar', id, nombre_display?, rol?, activo? }
//   { action:'reset_password', id, password }
//   { action:'eliminar', id }
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const DOMINIO_INTERNO = 'xcalacoco.local';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const normUsername = (u: string) => String(u || '').trim().toLowerCase();
const validUsername = (u: string) => /^[a-z0-9_\.]{3,32}$/.test(u);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST')    return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Cliente con el JWT del caller (para verificar quién llama)
  const authHeader = req.headers.get('Authorization') || '';
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !caller) return json({ error: 'no_autenticado' }, 401);

  // Verificar rol admin del caller
  const { data: callerPerfil } = await callerClient
    .from('perfiles').select('rol, activo').eq('id', caller.id).maybeSingle();
  if (!callerPerfil || callerPerfil.rol !== 'admin' || !callerPerfil.activo) {
    return json({ error: 'no_autorizado' }, 403);
  }

  // Cliente admin con service_role (puede crear usuarios en auth)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: 'body_invalido' }, 400); }

  const action = body?.action;

  // ─── CREAR ─────────────────────────────────────────────
  if (action === 'crear') {
    const username       = normUsername(body.username);
    const nombre_display = String(body.nombre_display || '').trim();
    const rol            = body.rol === 'admin' ? 'admin' : 'encargada';
    const password       = String(body.password || '');

    if (!validUsername(username)) return json({ error: 'username_invalido', mensaje: 'Solo letras, números, punto y guion bajo (3-32 caracteres)' }, 400);
    if (!nombre_display)           return json({ error: 'falta_nombre' }, 400);
    if (password.length < 6)       return json({ error: 'password_corta', mensaje: 'Mínimo 6 caracteres' }, 400);

    // ¿username ya existe?
    const { data: existe } = await admin.from('perfiles').select('id').eq('username', username).maybeSingle();
    if (existe) return json({ error: 'username_en_uso', mensaje: 'Ese usuario ya existe' }, 400);

    const email = `${username}@${DOMINIO_INTERNO}`;
    const { data: creado, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no mandar email de confirmación
      user_metadata: { username, nombre_display, rol },
    });
    if (createErr) return json({ error: 'create_failed', mensaje: createErr.message }, 400);

    // El trigger handle_new_user ya creó el perfil, pero por si acaso hacemos upsert
    await admin.from('perfiles').upsert({
      id: creado.user!.id,
      email, username, nombre_display, rol, activo: true,
    }, { onConflict: 'id' });

    return json({ ok: true, id: creado.user!.id, username });
  }

  // ─── EDITAR ────────────────────────────────────────────
  if (action === 'editar') {
    const id = String(body.id || '');
    if (!id) return json({ error: 'falta_id' }, 400);

    const patch: Record<string, unknown> = {};
    if (body.nombre_display !== undefined) patch.nombre_display = String(body.nombre_display).trim();
    if (body.rol !== undefined)            patch.rol = body.rol === 'admin' ? 'admin' : 'encargada';
    if (body.activo !== undefined)         patch.activo = !!body.activo;
    patch.actualizado = new Date().toISOString();

    const { error } = await admin.from('perfiles').update(patch).eq('id', id);
    if (error) return json({ error: 'update_failed', mensaje: error.message }, 400);
    return json({ ok: true });
  }

  // ─── RESET PASSWORD ────────────────────────────────────
  if (action === 'reset_password') {
    const id = String(body.id || '');
    const password = String(body.password || '');
    if (!id)                 return json({ error: 'falta_id' }, 400);
    if (password.length < 6) return json({ error: 'password_corta', mensaje: 'Mínimo 6 caracteres' }, 400);

    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return json({ error: 'update_failed', mensaje: error.message }, 400);
    return json({ ok: true });
  }

  // ─── ELIMINAR ──────────────────────────────────────────
  if (action === 'eliminar') {
    const id = String(body.id || '');
    if (!id) return json({ error: 'falta_id' }, 400);
    if (id === caller.id) return json({ error: 'no_autoeliminar', mensaje: 'No puedes eliminarte a ti mismo' }, 400);

    // Borra de auth; el ON DELETE CASCADE en perfiles limpia el perfil
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return json({ error: 'delete_failed', mensaje: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: 'action_desconocida' }, 400);
});
