/**
 * authService.js
 * =========================================================================
 * Servicio centralizado de autenticación y gestión de usuarios.
 *
 * Toda la persistencia se realiza en localStorage. Cuando se integre
 * Supabase (Fase 2), solo se reemplaza la capa de acceso a datos.
 *
 * Claves usadas:
 *   win_session       → sesión activa del usuario logueado
 *   win_users         → lista de usuarios registrados
 *   win_notificaciones → notificaciones para técnicos
 *   win_audit_log     → log de auditoría de acciones
 * =========================================================================
 */

// ─── Constantes ──────────────────────────────────────────────────────────────
const KEY_USERS    = 'win_users';
const KEY_SESSION  = 'win_session';
const KEY_NOTIFS   = 'win_notificaciones';
const KEY_AUDIT    = 'win_audit_log';

/**
 * Usuarios semilla — se crean la primera vez que arranca la app.
 * NOTA: Las contraseñas de producción deben hashearse con bcrypt en el backend.
 * Contraseñas cumplen la política: mayúscula, minúscula, número y símbolo.
 */
const DEFAULT_USERS = [
  {
    email:    'admin@win.pe',
    password: 'Admin@2025',
    role:     'ADMINISTRADOR',
    cuadrilla: 'GERENCIA',
    estado:   'Activo',
    creadoEn: new Date().toISOString()
  },
  {
    email:    'supervisor@win.pe',
    password: 'Super@2025',
    role:     'SUPERVISOR',
    cuadrilla: 'LIMA-NTE-01',
    estado:   'Activo',
    creadoEn: new Date().toISOString()
  }
];


// ─── Validadores ──────────────────────────────────────────────────────────────

/**
 * Valida que un string tenga formato de correo electrónico.
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());

/**
 * Valida que la contraseña cumpla la política de seguridad:
 *   - Mínimo 8 caracteres
 *   - Al menos 1 letra mayúscula
 *   - Al menos 1 letra minúscula
 *   - Al menos 1 número
 *   - Al menos 1 símbolo especial (!@#$%^&*...)
 *
 * @param {string} password
 * @returns {{ ok: boolean, error?: string }}
 */
export const validatePassword = (password) => {
  if (!password || password.length < 8)
    return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (!/[A-Z]/.test(password))
    return { ok: false, error: 'Debe incluir al menos una letra MAYÚSCULA.' };
  if (!/[a-z]/.test(password))
    return { ok: false, error: 'Debe incluir al menos una letra minúscula.' };
  if (!/[0-9]/.test(password))
    return { ok: false, error: 'Debe incluir al menos un número.' };
  if (!/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?`~]/.test(password))
    return { ok: false, error: 'Debe incluir al menos un símbolo especial (ej. @, #, !, %).' };
  return { ok: true };
};


// ─── Funciones Auxiliares Internas ────────────────────────────────────────────

const _readUsers  = () => { try { return JSON.parse(localStorage.getItem(KEY_USERS) || '[]'); } catch { return []; } };
const _writeUsers = (u) => localStorage.setItem(KEY_USERS, JSON.stringify(u));


// ─── Audit Log ────────────────────────────────────────────────────────────────

/**
 * Lee el historial de auditoría.
 * @returns {Array}
 */
export const getAuditLog = () => {
  try { return JSON.parse(localStorage.getItem(KEY_AUDIT) || '[]'); } catch { return []; }
};

/**
 * Registra una acción en el log de auditoría.
 *
 * @param {string} accion        - Ej: 'LOGIN', 'APROBAR', 'RECHAZAR', 'CREAR_USUARIO'
 * @param {string} recursoTipo   - 'ORDEN' | 'USUARIO' | 'SESION'
 * @param {string} recursoId     - Código del cliente o email del usuario afectado
 * @param {object} [detalle={}]  - Info extra (motivo, rol, etc.)
 */
export const addAuditLog = (accion, recursoTipo = '', recursoId = '', detalle = {}) => {
  const session = getSession();
  const logs = getAuditLog();
  logs.push({
    id:           `LOG-${Date.now()}`,
    timestamp:    new Date().toISOString(),
    usuarioEmail: session?.email || 'SISTEMA',
    rol:          session?.role  || '',
    accion,
    recursoTipo,
    recursoId,
    detalle
  });
  // Conservar solo los últimos 500 registros para no saturar localStorage
  if (logs.length > 500) logs.splice(0, logs.length - 500);
  localStorage.setItem(KEY_AUDIT, JSON.stringify(logs));
};


// ─── Notificaciones ───────────────────────────────────────────────────────────

/**
 * Lee todas las notificaciones almacenadas.
 * @returns {Array}
 */
export const getNotificaciones = () => {
  try { return JSON.parse(localStorage.getItem(KEY_NOTIFS) || '[]'); } catch { return []; }
};

/**
 * Crea una notificación para un técnico específico.
 *
 * @param {string} tecnicoEmail  - Email del técnico destinatario.
 * @param {string} tipo          - 'APROBADO' | 'RECHAZADO'
 * @param {string} codigoCliente - Código de la orden afectada.
 * @param {string} [motivo='']   - Motivo del rechazo (opcional).
 */
export const crearNotificacion = (tecnicoEmail, tipo, codigoCliente, motivo = '') => {
  const notifs = getNotificaciones();
  const msg = tipo === 'RECHAZADO'
    ? `Tu formulario de la orden ${codigoCliente} fue RECHAZADO. Motivo: ${motivo || 'Sin especificar'}`
    : `Tu formulario de la orden ${codigoCliente} fue APROBADO. ✅`;

  notifs.push({
    id:            `NOTIF-${Date.now()}`,
    tecnicoEmail,
    tipo,
    codigoCliente,
    motivo,
    mensaje:       msg,
    leida:         false,
    creadoEn:      new Date().toISOString()
  });
  localStorage.setItem(KEY_NOTIFS, JSON.stringify(notifs));
};

/**
 * Marca como leídas todas las notificaciones de un técnico.
 * @param {string} tecnicoEmail
 */
export const marcarNotificacionesLeidas = (tecnicoEmail) => {
  const notifs = getNotificaciones().map(n =>
    n.tecnicoEmail === tecnicoEmail ? { ...n, leida: true } : n
  );
  localStorage.setItem(KEY_NOTIFS, JSON.stringify(notifs));
};

/**
 * Cuenta las notificaciones no leídas de un técnico.
 * @param {string} tecnicoEmail
 * @returns {number}
 */
export const contarNotificacionesNoLeidas = (tecnicoEmail) =>
  getNotificaciones().filter(n => n.tecnicoEmail === tecnicoEmail && !n.leida).length;


// ─── API Pública de Autenticación ─────────────────────────────────────────────

/**
 * Inicializa los usuarios semilla si no existen en localStorage.
 * Se llama una sola vez al arrancar la app (en Login.jsx).
 */
export const initDefaultUsers = () => {
  if (_readUsers().length === 0) _writeUsers(DEFAULT_USERS);
};

/**
 * Autentica a un usuario contra la base local.
 * Acepta SOLO correos electrónicos con formato válido (usuario@dominio.ext).
 *
 * @param {string} email     - Correo electrónico del usuario.
 * @param {string} password  - Contraseña.
 * @param {string} cuadrilla - Cuadrilla (solo para auto-registro de técnicos nuevos).
 * @returns {{ success: boolean, session?: object, error?: string }}
 */
export const login = (email, password, cuadrilla = '') => {

  // 1. Validar formato de email
  if (!isValidEmail(email)) {
    return { success: false, error: 'Ingresa un correo electrónico válido (ej. tecnico@win.pe).' };
  }

  const users = _readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

  // 2. Usuario encontrado en la base local
  if (user) {
    if (user.estado === 'Bloqueado') {
      return { success: false, error: 'Tu cuenta ha sido bloqueada por el Administrador. Contacta a tu supervisor.' };
    }
    const session = { email: user.email, role: user.role, cuadrilla: user.cuadrilla };
    localStorage.setItem(KEY_SESSION, JSON.stringify(session));
    addAuditLog('LOGIN', 'SESION', email);
    return { success: true, session };
  }

  // 3. Auto-registro de técnico nuevo (primer acceso)
  if (email && password && cuadrilla) {
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.ok) return { success: false, error: pwdCheck.error };

    const newUser = { email, password, role: 'TECNICO', cuadrilla, estado: 'Activo', creadoEn: new Date().toISOString() };
    users.push(newUser);
    _writeUsers(users);

    const session = { email: newUser.email, role: newUser.role, cuadrilla: newUser.cuadrilla };
    localStorage.setItem(KEY_SESSION, JSON.stringify(session));
    addAuditLog('REGISTRO_TECNICO', 'USUARIO', email, { cuadrilla });
    return { success: true, session };
  }

  return { success: false, error: 'Credenciales inválidas. Verifica tu correo y contraseña.' };
};

/**
 * Cierra la sesión activa.
 */
export const logout = () => {
  addAuditLog('LOGOUT', 'SESION', getSession()?.email || '');
  localStorage.removeItem(KEY_SESSION);
};

/**
 * Obtiene la sesión activa.
 * @returns {object|null}
 */
export const getSession = () => {
  try { return JSON.parse(localStorage.getItem(KEY_SESSION) || 'null'); } catch { return null; }
};

/**
 * Lista todos los usuarios.
 * @returns {Array}
 */
export const getUsers = () => _readUsers();

/**
 * Agrega un usuario nuevo.
 * @param {{ email, password, role, cuadrilla }} data
 * @returns {{ success: boolean, error?: string }}
 */
export const addUser = (data) => {
  if (!isValidEmail(data.email))
    return { success: false, error: 'El email ingresado no tiene un formato válido.' };

  const pwdCheck = validatePassword(data.password);
  if (!pwdCheck.ok) return { success: false, error: pwdCheck.error };

  const users = _readUsers();
  if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase()))
    return { success: false, error: `El correo "${data.email}" ya está registrado.` };

  if (!data.email || !data.password || !data.role || !data.cuadrilla)
    return { success: false, error: 'Todos los campos son obligatorios.' };

  users.push({ ...data, estado: 'Activo', creadoEn: new Date().toISOString() });
  _writeUsers(users);
  addAuditLog('CREAR_USUARIO', 'USUARIO', data.email, { rol: data.role, cuadrilla: data.cuadrilla });
  return { success: true };
};

/**
 * Bloquea o desbloquea un usuario.
 * No permite bloquear al último Administrador activo.
 * @param {string} email
 * @returns {{ success: boolean, error?: string }}
 */
export const toggleBlock = (email) => {
  const users = _readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return { success: false, error: 'Usuario no encontrado.' };

  if (user.role === 'ADMINISTRADOR' && user.estado === 'Activo') {
    const activeAdmins = users.filter(u => u.role === 'ADMINISTRADOR' && u.estado === 'Activo');
    if (activeAdmins.length <= 1)
      return { success: false, error: 'No puedes bloquear al único Administrador activo del sistema.' };
  }

  const nuevoEstado = user.estado === 'Activo' ? 'Bloqueado' : 'Activo';
  user.estado = nuevoEstado;
  _writeUsers(users);
  addAuditLog('BLOQUEAR_USUARIO', 'USUARIO', email, { nuevoEstado });
  return { success: true };
};

/**
 * Elimina un usuario.
 * No permite eliminar al último Administrador.
 * @param {string} email
 * @returns {{ success: boolean, error?: string }}
 */
export const deleteUser = (email) => {
  const users = _readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return { success: false, error: 'Usuario no encontrado.' };

  if (user.role === 'ADMINISTRADOR') {
    if (users.filter(u => u.role === 'ADMINISTRADOR').length <= 1)
      return { success: false, error: 'No puedes eliminar al único Administrador del sistema.' };
  }

  _writeUsers(users.filter(u => u.email !== email));
  addAuditLog('ELIMINAR_USUARIO', 'USUARIO', email, { rolEliminado: user.role });
  return { success: true };
};
