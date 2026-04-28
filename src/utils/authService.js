/**
 * authService.js
 * =========================================================================
 * Servicio centralizado de autenticación y gestión de usuarios.
 * 
 * Toda la persistencia se realiza mediante localStorage bajo la clave
 * 'win_users'. Esto permite un CRUD funcional completo que sobrevive
 * entre recargas del navegador, sin depender de un backend externo.
 * 
 * Cuando se integre un backend (Node.js + PostgreSQL), solo se
 * reemplazará la capa de acceso a datos de este servicio.
 * =========================================================================
 */

// ─── Constantes ──────────────────────────────────────────────────────────────
const STORAGE_KEY_USERS   = 'win_users';
const STORAGE_KEY_SESSION = 'win_session';

/**
 * Usuarios semilla que se crean automáticamente la primera vez que
 * se ejecuta la aplicación (o si alguien borra manualmente el storage).
 */
const DEFAULT_USERS = [
  {
    email: 'admin',
    password: 'admin',
    role: 'ADMINISTRADOR',
    cuadrilla: 'GERENCIA',
    estado: 'Activo',
    creadoEn: new Date().toISOString()
  },
  {
    email: 'super',
    password: 'super',
    role: 'SUPERVISOR',
    cuadrilla: 'LIMA-NTE-01',
    estado: 'Activo',
    creadoEn: new Date().toISOString()
  }
];


// ─── Funciones Auxiliares Internas ────────────────────────────────────────────

/**
 * Lee el array de usuarios desde localStorage.
 * @returns {Array} Lista de objetos usuario.
 */
const _readUsers = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Persiste el array de usuarios en localStorage.
 * @param {Array} users - Lista actualizada de usuarios.
 */
const _writeUsers = (users) => {
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
};


// ─── API Pública ─────────────────────────────────────────────────────────────

/**
 * Inicializa los usuarios semilla si no existen en localStorage.
 * Se debe llamar una sola vez al arrancar la app (ej. en Login.jsx).
 */
export const initDefaultUsers = () => {
  const existing = _readUsers();
  if (existing.length === 0) {
    _writeUsers(DEFAULT_USERS);
  }
};

/**
 * Autentica un usuario contra la base local.
 * 
 * @param {string} email    - Correo o usuario ingresado.
 * @param {string} password - Contraseña ingresada.
 * @param {string} cuadrilla - Cuadrilla seleccionada (solo relevante para técnicos nuevos).
 * @returns {{ success: boolean, session?: object, error?: string }}
 */
export const login = (email, password, cuadrilla = '') => {
  const users = _readUsers();
  const user = users.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

  // Caso 1: Usuario encontrado en la base local
  if (user) {
    if (user.estado === 'Bloqueado') {
      return { success: false, error: 'Tu cuenta ha sido bloqueada por el Administrador. Contacta a tu supervisor.' };
    }

    const session = {
      email: user.email,
      role: user.role,
      cuadrilla: user.cuadrilla
    };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    return { success: true, session };
  }

  // Caso 2: Técnico nuevo que no existe en la base (auto-registro)
  // Solo si proporcionó cuadrilla (flujo de técnico desde el Login)
  if (email && password && cuadrilla) {
    const newUser = {
      email,
      password,
      role: 'TECNICO',
      cuadrilla,
      estado: 'Activo',
      creadoEn: new Date().toISOString()
    };
    users.push(newUser);
    _writeUsers(users);

    const session = {
      email: newUser.email,
      role: newUser.role,
      cuadrilla: newUser.cuadrilla
    };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    return { success: true, session };
  }

  return { success: false, error: 'Credenciales inválidas. Verifica tu usuario y contraseña.' };
};

/**
 * Cierra la sesión activa eliminando la clave de sesión.
 */
export const logout = () => {
  localStorage.removeItem(STORAGE_KEY_SESSION);
};

/**
 * Obtiene la sesión activa del usuario logueado.
 * @returns {object|null} Datos de sesión o null si no hay sesión.
 */
export const getSession = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Lista todos los usuarios registrados (para uso del panel de Admin).
 * Las contraseñas se incluyen solo porque estamos en modo local/demo.
 * @returns {Array} Lista de usuarios.
 */
export const getUsers = () => _readUsers();

/**
 * Agrega un usuario nuevo a la base local.
 * 
 * @param {{ email: string, password: string, role: string, cuadrilla: string }} data
 * @returns {{ success: boolean, error?: string }}
 */
export const addUser = (data) => {
  const users = _readUsers();
  const exists = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());

  if (exists) {
    return { success: false, error: `El usuario "${data.email}" ya está registrado.` };
  }

  if (!data.email || !data.password || !data.role || !data.cuadrilla) {
    return { success: false, error: 'Todos los campos son obligatorios.' };
  }

  users.push({
    ...data,
    estado: 'Activo',
    creadoEn: new Date().toISOString()
  });
  _writeUsers(users);
  return { success: true };
};

/**
 * Alterna el estado de un usuario entre 'Activo' y 'Bloqueado'.
 * No permite bloquear al último ADMINISTRADOR activo.
 * 
 * @param {string} email - Email del usuario a bloquear/desbloquear.
 * @returns {{ success: boolean, error?: string }}
 */
export const toggleBlock = (email) => {
  const users = _readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return { success: false, error: 'Usuario no encontrado.' };

  // Protección: no bloquear al último admin activo
  if (user.role === 'ADMINISTRADOR' && user.estado === 'Activo') {
    const activeAdmins = users.filter(u => u.role === 'ADMINISTRADOR' && u.estado === 'Activo');
    if (activeAdmins.length <= 1) {
      return { success: false, error: 'No puedes bloquear al único Administrador activo del sistema.' };
    }
  }

  user.estado = user.estado === 'Activo' ? 'Bloqueado' : 'Activo';
  _writeUsers(users);
  return { success: true };
};

/**
 * Elimina un usuario de la base local.
 * No permite eliminar al último ADMINISTRADOR.
 * 
 * @param {string} email - Email del usuario a eliminar.
 * @returns {{ success: boolean, error?: string }}
 */
export const deleteUser = (email) => {
  const users = _readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return { success: false, error: 'Usuario no encontrado.' };

  // Protección: no eliminar al último admin
  if (user.role === 'ADMINISTRADOR') {
    const admins = users.filter(u => u.role === 'ADMINISTRADOR');
    if (admins.length <= 1) {
      return { success: false, error: 'No puedes eliminar al único Administrador del sistema.' };
    }
  }

  const filtered = users.filter(u => u.email !== email);
  _writeUsers(filtered);
  return { success: true };
};
