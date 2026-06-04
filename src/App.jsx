import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import BuscadorCliente from './pages/BuscadorCliente';
import FormularioTecnico from './pages/FormularioTecnico';
import PanelAdmin from './pages/PanelAdmin';
import { UIProvider } from './components/ui/Modal';
import ProtectedRoute from './components/layout/ProtectedRoute';

function App() {

  // La validación de sesión vive en ProtectedRoute (bootstrapSession), que
  // verifica el JWT firmado de Supabase en cada ruta protegida. Ya no existe
  // ningún espejo de sesión en localStorage que limpiar al arrancar.

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
