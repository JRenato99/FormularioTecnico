import { supabase } from './supabaseClient';

const KEY_NOTIFS   = 'win_notificaciones';

// ─── Caché de sesión EN MEMORIA ──────────────────────────────────────────────
// La sesión ya NO se guarda en localStorage. Antes existía un "espejo" en
// localStorage (win_session) que cualquiera podía falsificar desde DevTools
// (p. ej. inyectar role: 'ADMINISTRADOR'). Ahora la sesión vive solo en memoria
// y se reconstruye desde el JWT FIRMADO de Supabase + el perfil real en win_users,
// que no son manipulables por el cliente.
let _session = null;

// Limpieza de migración: borrar el espejo inseguro si quedó de versiones previas.
try { localStorage.removeItem('win_session'); } catch { /* noop */ }

// Mantener el caché sincronizado cuando Supabase cierra la sesión.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') _session = null;
});

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
  // Esperamos (await) la escritura del log y manejamos el error explícitamente.
  // Antes era "fire-and-forget": si Supabase fallaba, el registro de auditoría
  // se perdía en silencio. Ahora devolvemos { ok } para que quien lo necesite
  // pueda reaccionar a un fallo de auditoría sin romper la acción principal.
  try {
    const { error } = await supabase.from('win_audit_logs').insert([{
      actor_id: session?.id || null,
      accion,
      entidad_afectada: recursoTipo,
      entidad_id: recursoId,
      descripcion: `${session?.email || 'SISTEMA'} ejecutó ${accion}`,
      new_data: detalle
    }]);

    if (error) {
      console.error('Fallo al registrar evento de auditoría:', error.code || error.message);
      return { ok: false, error };
    }
    return { ok: true };
  } catch (e) {
    console.error('Error inesperado registrando auditoría:', e?.message || e);
    return { ok: false, error: e };
  }
};

// ─── Notificaciones (Supabase Realtime) ──────────────────────────────────
export const getNotificaciones = async (tecnicoEmail) => {
  const { data, error } = await supabase
    .from('win_notificaciones')
    .select('*')
    .eq('tecnico_email', tecnicoEmail)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching notificaciones:', error);
    return [];
  }
  return data || [];
};

export const crearNotificacion = async (tecnicoEmail, tipo, codigoCliente, motivo = '') => {
  const msgs = {
    APROBADO:  `Tu formulario de la orden ${codigoCliente} fue APROBADO. ✅`,
    RECHAZADO: `Tu formulario de la orden ${codigoCliente} fue RECHAZADO. Motivo: ${motivo || 'Sin especificar'}`,
    REVERTIDO: `Tu orden ${codigoCliente} fue devuelta a Pendiente para revisión.${motivo ? ' Motivo: ' + motivo : ''}`,
  };
  const msg = msgs[tipo] ?? msgs.APROBADO;

  const { error } = await supabase.from('win_notificaciones').insert([{
    tecnico_email: tecnicoEmail,
    tipo,
    codigo_cliente: codigoCliente,
    motivo,
    mensaje: msg,
    leida: false
  }]);

  if (error) console.error('Error al crear notificacion:', error);
};

export const marcarNotificacionesLeidas = async (tecnicoEmail) => {
  const { error } = await supabase
    .from('win_notificaciones')
    .update({ leida: true })
    .eq('tecnico_email', tecnicoEmail)
    .eq('leida', false);

  if (error) console.error('Error al marcar notificaciones como leídas:', error);
};

export const contarNotificacionesNoLeidas = async (tecnicoEmail) => {
  const { count, error } = await supabase
    .from('win_notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('tecnico_email', tecnicoEmail)
    .eq('leida', false);

  if (error) {
    console.error('Error al contar notificaciones:', error);
    return 0;
  }
  return count || 0;
};

// ─── Sesión ────────────────────────────────────────────────────────────────────
// Acceso SÍNCRONO al perfil de la sesión actual. Devuelve null si aún no se
// hidrató (ver bootstrapSession). Los componentes protegidos se montan dentro de
// ProtectedRoute, que llama a bootstrapSession antes de renderizarlos, por lo que
// para ellos getSession() ya tiene datos.
export const getSession = () => _session;

/**
 * Reconstruye el caché de sesión en memoria a partir del JWT válido de Supabase
 * y el perfil real en win_users. Se invoca al arrancar/navegar (ProtectedRoute)
 * para que la sesión sobreviva a recargas de página sin depender de localStorage.
 * Retorna el perfil o null si no hay sesión válida.
 */
export const bootstrapSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) { _session = null; return null; }

  // Si ya tenemos en caché el perfil de este mismo usuario, lo reutilizamos
  // (el JWT ya quedó validado arriba) para evitar una consulta extra por navegación.
  if (_session && _session.id === session.user.id) return _session;

  const { data: profile, error: profileError } = await supabase
    .from('win_users')
    .select('id, email, role, cuadrilla, nombre, supervisor_tipo, empresa_id, dni, telefono')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) { _session = null; return null; }

  _session = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    cuadrilla: profile.cuadrilla,
    nombre: profile.nombre,
    supervisor_tipo: profile.supervisor_tipo,
    empresa_id: profile.empresa_id,
    dni: profile.dni,
    telefono: profile.telefono,
  };
  return _session;
};

export const initDefaultUsers = () => {};

// ─── LOGIN con validación de cuadrilla ────────────────────────────────────────
/**
 * Autentica al usuario contra Supabase Auth.
 * La cuadrilla ya no se valida en el login — permanece en BD como referencia.
 * Retorna { success, session?, mustChangePassword?, error? }
 */
export const login = async (email, password) => {
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

  // Poblar el caché de sesión EN MEMORIA (sin localStorage). Los guards de
  // React Router (ProtectedRoute) validan el JWT de Supabase, no este objeto.
  const session = {
    id: userProfile.id,
    email: userProfile.email,
    role: userProfile.role,
    cuadrilla: userProfile.cuadrilla,
    nombre: userProfile.nombre,
    supervisor_tipo: userProfile.supervisor_tipo,
    empresa_id: userProfile.empresa_id,
    dni: userProfile.dni,
    telefono: userProfile.telefono,
  };
  _session = session;
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
  _session = null;
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

  // Un SUPERVISOR debe estar clasificado como SGI, SGA o CONSULTOR (solo lectura)
  if (data.role === 'SUPERVISOR' && !['SGI', 'SGA', 'CONSULTOR'].includes(data.supervisor_tipo)) {
    return { success: false, error: 'Debes asignar el tipo de supervisor (SGI, SGA o Consultor).' };
  }

  // Para Admin y Supervisor, cuadrilla/empresa/dni/telefono son NULL
  const esTecnico = data.role === 'TECNICO';
  const cuadrillaFinal    = esTecnico ? (data.cuadrilla    || null) : null;
  const empresaIdFinal    = esTecnico ? (data.empresa_id   || null) : null;
  const dniFinal          = esTecnico ? (data.dni          || null) : null;
  const telefonoFinal     = esTecnico ? (data.telefono     || null) : null;

  // supervisor_tipo solo aplica a SUPERVISOR; NULL para los demás roles
  const supervisorTipoFinal = data.role === 'SUPERVISOR' ? data.supervisor_tipo : null;

  const { data: edgeData, error: edgeError } = await supabase.functions.invoke('manager-user', {
    body: { action: 'create', email: data.email, password: data.password, role: data.role }
  });

  if (edgeError) return { success: false, error: 'Error del servidor: ' + edgeError.message };
  if (edgeData?.error) return { success: false, error: edgeData.error };

  const newUserId = edgeData.user.id;

  const { error: dbError } = await supabase.from('win_users').insert([{
    id: newUserId,
    email: data.email,
    nombre: data.nombre || data.email.split('@')[0],
    role: data.role,
    estado: 'ACTIVO',
    cuadrilla: cuadrillaFinal,
    supervisor_tipo: supervisorTipoFinal,
    empresa_id: empresaIdFinal,
    dni: dniFinal,
    telefono: telefonoFinal,
    must_change_password: true
  }]);

  if (dbError) {
    // Si falla la inserción del perfil, intentamos borrar el usuario creado en Auth para no dejar huérfanos
    await supabase.functions.invoke('manager-user', { body: { action: 'delete', email: data.email } });
    return { success: false, error: 'Error al crear perfil: ' + dbError.message };
  }

  await addAuditLog('CREAR_USUARIO', 'USUARIO', data.email, { rol: data.role, cuadrilla: cuadrillaFinal, supervisorTipo: supervisorTipoFinal });
  return { success: true };
};

/**
 * Cambia la clasificación (SGI/SGA) de un supervisor existente.
 * Solo aplica a usuarios con rol SUPERVISOR.
 */
export const updateSupervisorTipo = async (email, tipo) => {
  if (!['SGI', 'SGA', 'CONSULTOR'].includes(tipo)) {
    return { success: false, error: 'Tipo inválido. Debe ser SGI, SGA o Consultor.' };
  }

  const { data: users } = await supabase.from('win_users').select('id, role').eq('email', email);
  if (!users || users.length === 0) return { success: false, error: 'Usuario no encontrado.' };
  if (users[0].role !== 'SUPERVISOR') {
    return { success: false, error: 'Solo los supervisores pueden tener tipo SGI/SGA/Consultor.' };
  }

  const { error } = await supabase.from('win_users').update({ supervisor_tipo: tipo }).eq('email', email);
  if (error) return { success: false, error: error.message };

  await addAuditLog('EDITAR_SUPERVISOR_TIPO', 'USUARIO', email, { tipo });
  return { success: true };
};

/**
 * Restablece la contraseña de un usuario. El Admin genera una contraseña temporal
 * y el sistema fuerza al usuario a cambiarla en su próximo ingreso.
 * NOTA: Supabase Admin API requiere la service_role key; usamos el workaround de
 * marcar must_change_password=TRUE y enviar email de reset.
 */
export const resetUserPassword = async (userEmail) => {
  // Enviar email de reseteo de contraseña via flujo oficial de Supabase
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(userEmail, {
    redirectTo: window.location.origin + '/#/login'
  });

  if (resetError) return { success: false, error: 'Error al enviar email de reseteo: ' + resetError.message };

  // Marcar must_change_password para que al ingresar se fuerce el cambio
  const { error: dbError } = await supabase
    .from('win_users')
    .update({ must_change_password: true })
    .eq('email', userEmail);

  if (dbError) return { success: false, error: 'Error actualizando perfil: ' + dbError.message };

  await addAuditLog('RESET_CONTRASENA', 'USUARIO', userEmail);
  return { success: true, message: `Se envió un email de restablecimiento a ${userEmail}.` };
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

  // Eliminar el usuario de Supabase Auth usando la Edge Function
  const { data: edgeData, error: edgeError } = await supabase.functions.invoke('manager-user', {
    body: { action: 'delete', email: email }
  });

  if (edgeError) return { success: false, error: 'Error del servidor: ' + edgeError.message };
  if (edgeData?.error && edgeData.error !== 'User not found in auth.users') {
    return { success: false, error: edgeData.error };
  }

  // Eliminar perfil público de win_users (si la tabla no tiene CASCADE o por seguridad)
  const { error } = await supabase.from('win_users').delete().eq('email', email);
  if (error) return { success: false, error: error.message };
  
  await addAuditLog('ELIMINAR_USUARIO', 'USUARIO', email, { rolEliminado: user.role });
  return { success: true };
};
