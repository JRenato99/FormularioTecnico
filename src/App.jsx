import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import BuscadorCliente from './pages/BuscadorCliente';
import FormularioTecnico from './pages/FormularioTecnico';
import PanelAdmin from './pages/PanelAdmin';
import { UIProvider } from './components/ui/Modal';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { supabase } from './utils/supabaseClient';

function App() {

  // C-04: Verificar que la sesión de Supabase Auth sea real al arrancar la app.
  // Si localStorage tiene win_session pero Supabase no tiene sesión activa,
  // limpiamos y forzamos re-login para evitar bypass de seguridad.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        localStorage.removeItem('win_session');
      }
    });
  }, []);

  return (
    <UIProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Ruta Pública */}
          <Route path="/login" element={<Login />} />

          {/* Rutas Protegidas Generales (Técnicos, Supervisores, Admins) */}
          <Route
            path="/buscar"
            element={
              <ProtectedRoute allowedRoles={['TECNICO', 'SUPERVISOR', 'ADMINISTRADOR']}>
                <BuscadorCliente />
              </ProtectedRoute>
            }
          />
          <Route
            path="/formulario"
            element={
              <ProtectedRoute allowedRoles={['TECNICO', 'SUPERVISOR', 'ADMINISTRADOR']}>
                <FormularioTecnico />
              </ProtectedRoute>
            }
          />

          {/* Rutas Privilegiadas (Solo Supervisores y Admins) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['SUPERVISOR', 'ADMINISTRADOR']}>
                <PanelAdmin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </UIProvider>
  );
}

export default App;
