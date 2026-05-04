import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Sun, Moon, LogOut, Bell, CheckCircle, XCircle } from 'lucide-react';
import { logout, getSession, getNotificaciones, marcarNotificacionesLeidas, contarNotificacionesNoLeidas } from '../../utils/authService';
import { supabase } from '../../utils/supabaseClient';
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

  // Estado de notificaciones
  const [notifs, setNotifs]             = useState([]);
  const [notifsBadge, setNotifsBadge]   = useState(0);
  const [showNotifs, setShowNotifs]     = useState(false);

  /**
   * Alterna la clase global del tema claro/oscuro en el DOM.
   */
  const toggleTheme = () => {
    const newVal = !isLightMode;
    setIsLightMode(newVal);
    document.body.classList.toggle('light-theme', newVal);
  };

  // Sincronizar estado del tema y notificaciones
  useEffect(() => {
    setIsLightMode(document.body.classList.contains('light-theme'));
    
    if (session.email) {
      actualizarNotificaciones();

      // Suscripción Realtime a cambios de órdenes
      const channel = supabase
        .channel('header-realtime')
        .on('postgres_changes', { event: 'UPDATE', table: 'win_orders', schema: 'public' }, (payload) => {
          // Si el estado cambió y el técnico es el actual, refrescar
          actualizarNotificaciones();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session.email]);

  const actualizarNotificaciones = () => {
    const todasNotifs = getNotificaciones().filter(n => n.tecnicoEmail === session.email);
    setNotifs(todasNotifs);
    setNotifsBadge(contarNotificacionesNoLeidas(session.email));
  };

  const handleToggleNotifs = () => {
    if (!showNotifs && session.email) {
      marcarNotificacionesLeidas(session.email);
      setNotifsBadge(0);
      setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
    }
    setShowNotifs(!showNotifs);
  };

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

        {/* Botón de Notificaciones */}
        {session.email && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleToggleNotifs}
              className={`theme-toggle-btn ${notifsBadge > 0 ? 'has-notifs' : ''}`}
              title="Notificaciones"
            >
              <Bell size={20} color={notifsBadge > 0 ? 'var(--win-orange)' : 'var(--text-primary)'} />
              {notifsBadge > 0 && (
                <span className="notif-badge-bubble">
                  {notifsBadge}
                </span>
              )}
            </button>

            {/* Panel de notificaciones desplegable */}
            {showNotifs && (
              <div className="notif-dropdown animate-fade-in">
                <div className="notif-dropdown-header">Notificaciones</div>
                <div className="notif-dropdown-body">
                  {notifs.length === 0 ? (
                    <p className="notif-empty-text">Sin notificaciones nuevas.</p>
                  ) : (
                    notifs.slice().reverse().map(n => (
                      <div key={n.id} className={`notif-item ${n.leida ? '' : 'unread'}`}>
                        <div className={`notif-status-icon ${n.tipo === 'RECHAZADO' ? 'error' : 'success'}`}>
                          {n.tipo === 'RECHAZADO' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                        </div>
                        <div className="notif-content">
                          <p className="notif-msg">
                            <strong>{n.tipo}:</strong> Orden {n.codigoCliente}
                          </p>
                          {n.motivo && <p className="notif-motivo">{n.motivo}</p>}
                          <p className="notif-time">{new Date(n.creadoEn).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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
