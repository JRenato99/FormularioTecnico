import { supabase } from './supabaseClient';

const KEY_SESSION  = 'win_session';
const KEY_NOTIFS   = 'win_notificaciones';

// ─── Validadores ──────────────────────────────────────────────────────────────
export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());

export const validatePassword = (password) => {
  if (!password || password.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (!/[A-Z]/.test(password)) return { ok: false, error: 'Debe incluir al menos una letra MAYÚSCULA.' };
  if (!/[a-z]/.test(password)) return { ok: false, error: 'Debe incluir al menos una letra minúscula.' };
  if (!/[0-9]/.test(password)) return { ok: false, error: 'Debe incluir al menos un número.' };
  if (!/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(password)) return { ok: false, error: 'Debe incluir al menos un símbolo especial.' };
  return { ok: true };
};

// ─── Audit Log (Mapeado a Supabase) ──────────────────────────────────────────
export const getAuditLog = async () => {
  const { data, error } = await supabase.from('win_audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) { console.error('Error fetching audit logs:', error); return []; }
  return data;
};

export const addAuditLog = async (accion, recursoTipo = '', recursoId = '', detalle = {}) => {
  const session = getSession();
  
  // Para no bloquear la UI principal, disparamos esto de forma asíncrona sin await obligatorio
  supabase.from('win_audit_logs').insert([{
    accion,
    entidad_afectada: recursoTipo,
    entidad_id: recursoId,
    descripcion: `${session?.email || 'SISTEMA'} ejecutó ${accion}`,
    new_data: detalle
  }]).then(({ error }) => {
    if (error) console.error('Failed to log audit event', error);
  });
};

// ─── Notificaciones (Mantenido local por ahora, migraremos a Supabase Realtime después) 
export const getNotificaciones = () => {
  try { return JSON.parse(localStorage.getItem(KEY_NOTIFS) || '[]'); } catch { return []; }
};

export const crearNotificacion = (tecnicoEmail, tipo, codigoCliente, motivo = '') => {
  const notifs = getNotificaciones();
  const msg = tipo === 'RECHAZADO'
    ? `Tu formulario de la orden ${codigoCliente} fue RECHAZADO. Motivo: ${motivo || 'Sin especificar'}`
    : `Tu formulario de la orden ${codigoCliente} fue APROBADO. ✅`;

  notifs.push({
    id: `NOTIF-${Date.now()}`,
    tecnicoEmail, tipo, codigoCliente, motivo, mensaje: msg, leida: false, creadoEn: new Date().toISOString()
  });
  localStorage.setItem(KEY_NOTIFS, JSON.stringify(notifs));
};

export const marcarNotificacionesLeidas = (tecnicoEmail) => {
  const notifs = getNotificaciones().map(n => n.tecnicoEmail === tecnicoEmail ? { ...n, leida: true } : n);
  localStorage.setItem(KEY_NOTIFS, JSON.stringify(notifs));
};

export const contarNotificacionesNoLeidas = (tecnicoEmail) =>
  getNotificaciones().filter(n => n.tecnicoEmail === tecnicoEmail && !n.leida).length;


// ─── API de Autenticación con Supabase ───────────────────────────────────────

export const initDefaultUsers = () => {
  // Ya no hace falta, el seed se hace vía SQL en Supabase
};

export const login = async (email, password, cuadrilla = '') => {
  if (!isValidEmail(email)) return { success: false, error: 'Ingresa un correo válido.' };

  // Intentar loguear con Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  
  if (authError) {
    return { success: false, error: 'Credenciales inválidas o usuario no existe.' };
  }

  // Buscar perfil en win_users
  const { data: userProfile, error: profileError } = await supabase
    .from('win_users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !userProfile) {
    await supabase.auth.signOut();
    return { success: false, error: 'Tu perfil no está configurado en el sistema.' };
  }

  if (userProfile.estado === 'BLOQUEADO') {
    await supabase.auth.signOut();
    return { success: false, error: 'Tu cuenta ha sido bloqueada por el Administrador.' };
  }

  // Guardamos un espejo sincrónico de la sesión para no quebrar las rutas protegidas de React
  const session = { email: userProfile.email, role: userProfile.role, cuadrilla: userProfile.cuadrilla, id: userProfile.id };
  localStorage.setItem(KEY_SESSION, JSON.stringify(session));
  
  await addAuditLog('LOGIN', 'SESION', email);
  return { success: true, session };
};

export const logout = async () => {
  await addAuditLog('LOGOUT', 'SESION', getSession()?.email || '');
  localStorage.removeItem(KEY_SESSION);
  await supabase.auth.signOut();
};

export const getSession = () => {
  try { return JSON.parse(localStorage.getItem(KEY_SESSION) || 'null'); } catch { return null; }
};

// ─── Gestión de Usuarios (Supabase) ──────────────────────────────────────────

export const getUsers = async () => {
  const { data, error } = await supabase.from('win_users').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  // Mapear para compatibilidad con la vista de PanelAdmin
  return data.map(u => ({
    ...u,
    estado: u.estado === 'ACTIVO' ? 'Activo' : 'Bloqueado'
  }));
};

export const addUser = async (data) => {
  if (!isValidEmail(data.email)) return { success: false, error: 'El email no es válido.' };
  const pwdCheck = validatePassword(data.password);
  if (!pwdCheck.ok) return { success: false, error: pwdCheck.error };
  if (!data.role) return { success: false, error: 'Todos los campos son obligatorios.' };

  // Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password
  });

  if (authError) return { success: false, error: authError.message };
  if (!authData.user) return { success: false, error: 'Error desconocido al crear usuario en Auth.' };

  // Insertar en win_users
  const { error: dbError } = await supabase.from('win_users').insert([{
    id: authData.user.id,
    email: data.email,
    nombre: data.email.split('@')[0], // placeholder
    role: data.role,
    estado: 'ACTIVO',
    cuadrilla: data.cuadrilla || null
  }]);

  if (dbError) {
    return { success: false, error: 'Error al crear perfil en la base de datos: ' + dbError.message };
  }

  await addAuditLog('CREAR_USUARIO', 'USUARIO', data.email, { rol: data.role, cuadrilla: data.cuadrilla });
  return { success: true };
};

export const toggleBlock = async (email) => {
  // Primero buscamos el usuario
  const { data: users } = await supabase.from('win_users').select('*').eq('email', email);
  if (!users || users.length === 0) return { success: false, error: 'Usuario no encontrado.' };
  
  const user = users[0];
  const nuevoEstado = user.estado === 'ACTIVO' ? 'BLOQUEADO' : 'ACTIVO';

  if (user.role === 'ADMINISTRADOR' && user.estado === 'ACTIVO') {
    const { data: admins } = await supabase.from('win_users').select('id').eq('role', 'ADMINISTRADOR').eq('estado', 'ACTIVO');
    if (admins && admins.length <= 1) {
      return { success: false, error: 'No puedes bloquear al único Administrador activo del sistema.' };
    }
  }

  const { error } = await supabase.from('win_users').update({ estado: nuevoEstado }).eq('email', email);
  if (error) return { success: false, error: error.message };

  await addAuditLog('BLOQUEAR_USUARIO', 'USUARIO', email, { nuevoEstado });
  return { success: true };
};

export const deleteUser = async (email) => {
  const { data: users } = await supabase.from('win_users').select('*').eq('email', email);
  if (!users || users.length === 0) return { success: false, error: 'Usuario no encontrado.' };
  const user = users[0];

  if (user.role === 'ADMINISTRADOR') {
    const { data: admins } = await supabase.from('win_users').select('id').eq('role', 'ADMINISTRADOR');
    if (admins && admins.length <= 1) {
      return { success: false, error: 'No puedes eliminar al único Administrador del sistema.' };
    }
  }

  // Nota: Para borrar un usuario de Auth se necesita el Rol de Servicio (Edge Function)
  // Pero al menos podemos borrarlo de win_users. Si win_users lo borra y ON DELETE CASCADE funciona, bien.
  // Por ahora lo borramos de win_users. (Esto es una limitación del Frontend)
  const { error } = await supabase.from('win_users').delete().eq('email', email);
  if (error) return { success: false, error: error.message };

  await addAuditLog('ELIMINAR_USUARIO', 'USUARIO', email, { rolEliminado: user.role });
  return { success: true };
};
