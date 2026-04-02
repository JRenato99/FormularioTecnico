import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button } from '../components/ui';
import { Wifi, ArrowRight } from 'lucide-react';
import './Login.css';

/**
 * Componente Login
 * Representa la pantalla de acceso principal para los técnicos.
 */
const Login = () => {
  const navigate = useNavigate();
  
  // Estados locales para capturar los datos del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /**
   * Manejador temporal para simular el inicio de sesión.
   * En un proyecto real, aquí se llamaría a una API (ej. validación JWT).
   * Al pasar la validación, redirige al técnico a la pantalla de búsqueda.
   */
  const handleLogin = (e) => {
    e.preventDefault(); // Evita que la página recargue tras el submit
    if (email && password) {
      // Mock login exitoso
      navigate('/buscar');
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-form-wrapper animate-fade-in">
        
        {/* Encabezado con Icono y Texto */}
        <div className="login-header">
          <div className="login-logo-container">
             <Wifi size={32} color="white" />
          </div>
          <h1 className="login-title">Portal WIN</h1>
          <p className="login-subtitle">Acceso para Técnicos</p>
        </div>

        {/* Tarjeta con los campos del formulario */}
        <Card>
          <form className="login-form" onSubmit={handleLogin}>
            <Input 
              label="Usuario o Correo" 
              type="text" 
              placeholder="tecnico@win.pe" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input 
              label="Contraseña" 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <Button type="submit" className="login-submit-btn">
              Ingresar <ArrowRight size={18} />
            </Button>
          </form>
        </Card>
        
      </div>
    </div>
  );
};

export default Login;
