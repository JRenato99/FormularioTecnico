import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { bootstrapSession } from '../../utils/authService';

/**
 * ProtectedRoute
 * Intercepta la navegación y verifica que el usuario tenga una sesión válida en Supabase.
 * También permite restringir el acceso a ciertos roles.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      // bootstrapSession valida el JWT firmado de Supabase y reconstruye el
      // perfil (rol) desde win_users. El rol viene SIEMPRE de la BD, no de
      // metadata manipulable. Además deja el caché listo para getSession().
      const profile = await bootstrapSession();

      if (!profile) {
        setIsAuthenticated(false);
        return;
      }

      setUserRole(profile.role);
      setIsAuthenticated(true);
    };

    checkSession();
  }, []);

  // Mientras verifica con el backend, mostramos un estado de carga
  if (isAuthenticated === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Verificando credenciales...</p>
      </div>
    );
  }

  // Si no hay sesión válida, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Si pasamos un array de roles permitidos y el rol actual no está ahí...
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/buscar" replace />;
  }

  return children;
};

export default ProtectedRoute;
