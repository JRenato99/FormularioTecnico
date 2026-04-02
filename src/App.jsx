import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import BuscadorCliente from './pages/BuscadorCliente';
import DashboardInstalacion from './pages/DashboardInstalacion';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/buscar" element={<BuscadorCliente />} />
        <Route path="/dashboard" element={<DashboardInstalacion />} />
      </Routes>
    </Router>
  )
}

export default App;
