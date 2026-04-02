import React from 'react';
import { Wifi } from 'lucide-react';
import './Header.css';

/**
 * Componente Header
 * Barra de navegación superior fija que muestra el branding de WIN y 
 * la información del técnico autenticado actual.
 */
export const Header = () => {
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
      
      {/* Sección Derecha: Info del Usuario Técnico */}
      <div className="header-profile-section">
        <div className="header-profile-info">
          <p className="header-profile-name">Téc. Juan Pérez</p>
          <p className="header-profile-id">ID: WIN-4829</p>
        </div>
      </div>
      
    </header>
  );
};
