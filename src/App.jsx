import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import BuscadorCliente from './pages/BuscadorCliente';
import FormularioTecnico from './pages/FormularioTecnico';
import PanelAdmin from './pages/PanelAdmin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/buscar" element={<BuscadorCliente />} />
        <Route path="/formulario" element={<FormularioTecnico />} />
        <Route path="/admin" element={<PanelAdmin />} />
      </Routes>
    </Router>
  )
}

export default App;
