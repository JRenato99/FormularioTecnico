import React, { useState, useEffect } from 'react';
import { Wifi, Sun, Moon } from 'lucide-react';
import './Header.css';

/**
 * Componente Header
 * Barra de navegación superior fija que muestra el branding de WIN,
 * la información extendida de la cuadrilla (obtenida del Login por LocalStorage)
 * y el botón Toggle para cambiar al Modo Día/Noche.
 */
export const Header = () => {
  // Estado para el tema global
  const [isLightMode, setIsLightMode] = useState(false);
  
  // Extraemos la sesión virtual configurada en el Login.
  const sessionData = JSON.parse(localStorage.getItem('win_session') || '{}');
  const tecnicoNombre = sessionData.email || 'Téc. Invitado';
  const cuadrillaNombre = sessionData.cuadrilla || 'No Asignada';
  const distrito = sessionData.cuadrilla === 'Otro' ? sessionData.cuadrillaPersonalizada : 'Lima / General';

  /**
   * Alterne la clase global Theming en el DOM.
   */
  const toggleTheme = () => {
    const newVal = !isLightMode;
    setIsLightMode(newVal);
    if (newVal) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  };

  // Mantener coherencia visual si la clase existe por defecto.
  useEffect(() => {
    setIsLightMode(document.body.classList.contains('light-theme'));
  }, []);

  return (
    <header className="app-header">
      
      {/* Sección Izquierda: Branding logo y nombre */}
      <div className="header-logo-section">
        <div className="header-icon-box">
          <Wifi size={20} color="white" />
        </div>
        <h2 className="header-title">
          WIN <span className="header-title-accent">Técnicos</span>
        </h2>
      </div>
      
      {/* Sección Derecha: Info del Usuario Técnico y Toggle Theme */}
      <div className="header-profile-section">
        
        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn"
          title={isLightMode ? "Cambiar a Modo Noche" : "Cambiar a Modo Día"}
        >
          {isLightMode ? <Moon size={20} color="var(--text-primary)" /> : <Sun size={20} color="var(--win-orange)" />}
        </button>

        <div className="header-profile-info">
          <p className="header-profile-name">{tecnicoNombre}</p>
          <p className="header-profile-id">ID: WIN-{Intl.DateTimeFormat('es').format(new Date()).replace(/\//g, '')} | Cuadrilla: {cuadrillaNombre}</p>
          <p className="header-profile-id" style={{fontSize: '0.75rem', opacity: 0.8}}>Distrito: {distrito}</p>
        </div>
      </div>
      
    </header>
  );
};
