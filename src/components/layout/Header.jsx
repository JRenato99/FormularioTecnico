import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Sun, Moon, LogOut } from 'lucide-react';
import { logout, getSession } from '../../utils/authService';
import './Header.css';

/**
 * Componente Header
 * -----------------
 * Barra de navegación superior fija que muestra:
 * - Branding de WIN (logo + nombre).
 * - Información del usuario logueado (email, cuadrilla, distrito).
 * - Botón de alternancia Modo Día/Noche.
 * - Botón de Cerrar Sesión.
 * 
 * La información del usuario se extrae de la sesión en localStorage.
 */
export const Header = () => {
  const navigate = useNavigate();
  const [isLightMode, setIsLightMode] = useState(false);
  
  // Extraemos la sesión del usuario logueado
  const session = getSession() || {};
  const userName   = session.email     || 'Invitado';
  const cuadrilla  = session.cuadrilla || 'No Asignada';
  const rolLabel   = session.role      || '';

  /**
   * Alterna la clase global del tema claro/oscuro en el DOM.
   */
  const toggleTheme = () => {
    const newVal = !isLightMode;
    setIsLightMode(newVal);
    document.body.classList.toggle('light-theme', newVal);
  };

  // Sincronizar estado del tema con la clase del body al montar
  useEffect(() => {
    setIsLightMode(document.body.classList.contains('light-theme'));
  }, []);

  /**
   * Cierra la sesión activa y redirige al login.
   */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /**
   * Devuelve una etiqueta coloreada según el rol del usuario.
   */
  const getRolBadge = () => {
    const colors = {
      ADMINISTRADOR: '#FF3D00',
      SUPERVISOR:    '#1E90FF',
      TECNICO:       '#00C853'
    };
    const color = colors[rolLabel] || 'var(--text-secondary)';
    return (
      <span className="header-rol-badge" style={{ color, borderColor: color }}>
        {rolLabel}
      </span>
    );
  };

  return (
    <header className="app-header">
      
      {/* Sección Izquierda: Logo y Branding */}
      <div className="header-logo-section">
        <div className="header-icon-box">
          <Wifi size={20} color="white" />
        </div>
        <h2 className="header-title">
          WIN <span className="header-title-accent">Técnicos</span>
        </h2>
      </div>
      
      {/* Sección Derecha: Info del Usuario + Controles */}
      <div className="header-profile-section">
        
        {/* Toggle Tema Día/Noche */}
        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn"
          title={isLightMode ? "Cambiar a Modo Noche" : "Cambiar a Modo Día"}
        >
          {isLightMode 
            ? <Moon size={20} color="var(--text-primary)" /> 
            : <Sun size={20} color="var(--win-orange)" />
          }
        </button>

        {/* Info del Usuario */}
        <div className="header-profile-info">
          <p className="header-profile-name">
            {userName} {getRolBadge()}
          </p>
          <p className="header-profile-id">
            Cuadrilla: {cuadrilla}
          </p>
        </div>

        {/* Botón Cerrar Sesión */}
        <button 
          onClick={handleLogout} 
          className="header-logout-btn"
          title="Cerrar Sesión"
        >
          <LogOut size={18} />
        </button>
      </div>
      
    </header>
  );
};
