import { supabase } from './supabaseClient';

const KEY_SESSION  = 'win_session';
const KEY_NOTIFS   = 'win_notificaciones';

// ─── Validadores ───────────────────────────────────────────────────────────────
export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());

const validatePassword = (password) => {
  if (!password || password.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (!/[A-Z]/.test(password)) return { ok: false, error: 'Debe incluir al menos una letra MAYÚSCULA.' };
  if (!/[a-z]/.test(password)) return { ok: false, error: 'Debe incluir al menos una letra minúscula.' };
  if (!/[0-9]/.test(password)) return { ok: false, error: 'Debe incluir al menos un número.' };
  if (!/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(password)) return { ok: false, error: 'Debe incluir al menos un símbolo especial.' };
  return { ok: true };
};

// ─── Audit Log (Supabase) ──────────────────────────────────────────────────────
// getAuditLog eliminado por redundancia con databaseService.js

export const addAuditLog = async (accion, recursoTipo = '', recursoId = '', detalle = {}) => {
  const session = getSession();
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

// ─── Notificaciones (local, futuro: Supabase Realtime) ───────────────────────
export const getNotificaciones = () => {
  try { return JSON.parse(localStorage.getItem(KEY_NOTIFS) || '[]'); } catch { return []; }
};

export const crearNotificacion = (tecnicoEmail, tipo, codigoCliente, motivo = '') => {
  const notifs = getNotificaciones();
  const msg = tipo === 'RECHAZADO'
    ? `Tu formulario de la orden ${codigoCliente} fue RECHAZADO. Motivo: ${motivo || 'Sin especificar'}`
    : `Tu formulario de la orden ${codigoCliente} fue APROBADO. ✅`;
  notifs.push({ id: `NOTIF-${Date.now()}`, tecnicoEmail, tipo, codigoCliente, motivo, mensaje: msg, leida: false, creadoEn: new Date().toISOString() });
  localStorage.setItem(KEY_NOTIFS, JSON.stringify(notifs));
};

export const marcarNotificacionesLeidas = (tecnicoEmail) => {
  const notifs = getNotificaciones().map(n => n.tecnicoEmail === tecnicoEmail ? { ...n, leida: true } : n);
  localStorage.setItem(KEY_NOTIFS, JSON.stringify(notifs));
};

export const contarNotificacionesNoLeidas = (tecnicoEmail) =>
  getNotificaciones().filter(n => n.tecnicoEmail === tecnicoEmail && !n.leida).length;

// ─── Sesión ────────────────────────────────────────────────────────────────────
export const getSession = () => {
  try { return JSON.parse(localStorage.getItem(KEY_SESSION) || 'null'); } catch { return null; }
};

export const initDefaultUsers = () => {};

// ─── LOGIN con validación de cuadrilla ────────────────────────────────────────
/**
 * Autentica al usuario contra Supabase Auth y valida su cuadrilla.
 * Para ADMINISTRADOR y SUPERVISOR la cuadrilla en BD es NULL → se omite la validación.
 * Retorna { success, session?, mustChangePassword?, error? }
 */
export const login = async (email, password, cuadrilla = '') => {
  if (!isValidEmail(email)) return { success: false, error: 'Ingresa un correo válido.' };

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) return { success: false, error: 'Credenciales inválidas o usuario no existe.' };

  const { data: userProfile, error: profileError } = await supabase
    .from('win_users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !userProfile) {
    await supabase.auth.signOut();
    return { success: false, error: 'Tu perfil no está configurado en el sistema. Contacta al Administrador.' };
  }

  if (userProfile.estado === 'BLOQUEADO') {
    await supabase.auth.signOut();
    return { success: false, error: 'Tu cuenta ha sido bloqueada. Contacta al Administrador.' };
  }

  // Validación de cuadrilla solo para TECNICO (Admin y Supervisor tienen cuadrilla NULL)
  if (userProfile.role === 'TECNICO' && userProfile.cuadrilla) {
    if (cuadrilla !== userProfile.cuadrilla) {
      await supabase.auth.signOut();
      return { success: false, error: 'WRONG_CUADRILLA', cuadrillaEsperada: userProfile.cuadrilla };
    }
  }

  // Guardar espejo de sesión en localStorage para guards de React Router
  const session = {
    id: userProfile.id,
    email: userProfile.email,
    role: userProfile.role,
    cuadrilla: userProfile.cuadrilla,
    nombre: userProfile.nombre
  };
  localStorage.setItem(KEY_SESSION, JSON.stringify(session));
  await addAuditLog('LOGIN', 'SESION', email);

  return {
    success: true,
    session,
    mustChangePassword: userProfile.must_change_password === true
  };
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
export const logout = async () => {
  await addAuditLog('LOGOUT', 'SESION', getSession()?.email || '');
  localStorage.removeItem(KEY_SESSION);
  await supabase.auth.signOut();
};

// ─── CAMBIAR CONTRASEÑA (primer ingreso o reset) ──────────────────────────────
/**
 * Cambia la contraseña del usuario autenticado actualmente y
 * limpia el flag must_change_password en la BD.
 */
export const changePassword = async (newPassword) => {
  const pwdCheck = validatePassword(newPassword);
  if (!pwdCheck.ok) return { success: false, error: pwdCheck.error };

  // Actualizar contraseña en Supabase Auth
  const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
  if (authError) return { success: false, error: 'No se pudo cambiar la contraseña: ' + authError.message };

  // Limpiar flag en win_users
  const session = getSession();
  if (session?.id) {
    await supabase.from('win_users').update({ must_change_password: false }).eq('id', session.id);
  }

  await addAuditLog('CAMBIAR_CONTRASENA', 'SESION', session?.email || '');
  return { success: true };
};

// ─── Gestión de Usuarios (Admin) ──────────────────────────────────────────────
export const getUsers = async () => {
  const { data, error } = await supabase.from('win_users').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Error fetching users:', error); return []; }
  return data.map(u => ({
    ...u,
    estado: u.estado === 'ACTIVO' ? 'Activo' : 'Bloqueado'
  }));
};

/**
 * Crea un usuario nuevo. La contraseña ingresada por el Admin es temporal;
 * el sistema fuerza al usuario a cambiarla en su primer ingreso.
 */
export const addUser = async (data) => {
  if (!isValidEmail(data.email)) return { success: false, error: 'El email no es válido.' };
  const pwdCheck = validatePassword(data.password);
  if (!pwdCheck.ok) return { success: false, error: pwdCheck.error };
  if (!data.role) return { success: false, error: 'Todos los campos son obligatorios.' };

  // Para Admin y Supervisor, cuadrilla es NULL
  const cuadrillaFinal = (data.role === 'ADMINISTRADOR' || data.role === 'SUPERVISOR')
    ? null
    : (data.cuadrilla || null);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password
  });
  if (authError) return { success: false, error: authError.message };
  if (!authData.user) return { success: false, error: 'Error desconocido al crear usuario.' };

  const { error: dbError } = await supabase.from('win_users').insert([{
    id: authData.user.id,
    email: data.email,
    nombre: data.nombre || data.email.split('@')[0],
    role: data.role,
    estado: 'ACTIVO',
    cuadrilla: cuadrillaFinal,
    must_change_password: true   // ← Siempre TRUE al crear
  }]);

  if (dbError) return { success: false, error: 'Error al crear perfil: ' + dbError.message };

  await addAuditLog('CREAR_USUARIO', 'USUARIO', data.email, { rol: data.role, cuadrilla: cuadrillaFinal });
  return { success: true };
};

/**
 * Restablece la contraseña de un usuario. El Admin genera una contraseña temporal
 * y el sistema fuerza al usuario a cambiarla en su próximo ingreso.
 * NOTA: Supabase Admin API requiere la service_role key; usamos el workaround de
 * marcar must_change_password=TRUE y enviar email de reset.
 */
export const resetUserPassword = async (userEmail, newTempPassword) => {
  const pwdCheck = validatePassword(newTempPassword);
  if (!pwdCheck.ok) return { success: false, error: pwdCheck.error };

  // Marcar must_change_password en win_users
  const { error: dbError } = await supabase
    .from('win_users')
    .update({ must_change_password: true })
    .eq('email', userEmail);

  if (dbError) return { success: false, error: 'Error actualizando perfil: ' + dbError.message };

  await addAuditLog('RESET_CONTRASENA', 'USUARIO', userEmail);
  return { success: true };
};

export const toggleBlock = async (email) => {
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
  const { error } = await supabase.from('win_users').delete().eq('email', email);
  if (error) return { success: false, error: error.message };
  await addAuditLog('ELIMINAR_USUARIO', 'USUARIO', email, { rolEliminado: user.role });
  return { success: true };
};
