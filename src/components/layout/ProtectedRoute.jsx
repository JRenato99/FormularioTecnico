import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute
 * Intercepta la navegación y verifica que el usuario tenga una sesión válida (localmente).
 * También permite restringir el acceso a ciertos roles (ej. solo SUPERVISOR o ADMINISTRADOR).
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const sessionStr = localStorage.getItem('win_session');

  // Si no hay sesión, mandarlo de vuelta al login
  if (!sessionStr) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  try {
    const session = JSON.parse(sessionStr);

    // Si pasamos un array de roles permitidos y el rol actual no está ahí...
    if (allowedRoles && !allowedRoles.includes(session.role)) {
      // Si el rol no está permitido (ej: un TECNICO queriendo entrar a /admin)
      // Lo regresamos a su página principal permitida
      return <Navigate to="/buscar" replace />;
    }

    return children;
  } catch (error) {
    // Si la sesión está corrupta en el localStorage
    localStorage.removeItem('win_session');
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
