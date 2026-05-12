import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

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
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        setIsAuthenticated(false);
        localStorage.removeItem('win_session'); // Limpiar espejo inseguro
        return;
      }

      // El rol se extrae de la metadata del token de Supabase (seguro)
      // o consultando la tabla win_users si no está en el token
      const role = session.user?.user_metadata?.role;
      
      if (!role) {
        // Fallback: Consultar BD si el rol no está en la metadata
        const { data: profile } = await supabase
          .from('win_users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setUserRole(profile?.role || 'TECNICO');
      } else {
        setUserRole(role);
      }
      
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
