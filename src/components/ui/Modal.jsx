import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Key, X, ShieldAlert } from 'lucide-react';
import './Modal.css';

// ─────────────────────────────────────────────────────────────────
// CONTEXTO GLOBAL
// Permite llamar a showModal/showToast desde cualquier componente
// ─────────────────────────────────────────────────────────────────
const UIContext = createContext(null);

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI debe usarse dentro de <UIProvider>');
  return ctx;
};

// ─────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE ÍCONOS Y COLORES POR TIPO
// ─────────────────────────────────────────────────────────────────
const CONFIG = {
  success: {
    icon: CheckCircle,
    color: 'var(--success)',
    bg: 'rgba(46, 202, 127, 0.12)',
    label: 'Éxito'
  },
  error: {
    icon: XCircle,
    color: 'var(--error)',
    bg: 'rgba(255, 77, 77, 0.12)',
    label: 'Error'
  },
  warning: {
    icon: AlertTriangle,
    color: '#FFB830',
    bg: 'rgba(255, 184, 48, 0.12)',
    label: 'Advertencia'
  },
  info: {
    icon: Info,
    color: '#1E90FF',
    bg: 'rgba(30, 144, 255, 0.12)',
    label: 'Información'
  },
  password: {
    icon: Key,
    color: 'var(--win-orange)',
    bg: 'rgba(255, 107, 0, 0.12)',
    label: 'Seguridad'
  },
  confirm: {
    icon: ShieldAlert,
    color: '#FFB830',
    bg: 'rgba(255, 184, 48, 0.12)',
    label: 'Confirmar'
  }
};

// ─────────────────────────────────────────────────────────────────
// COMPONENTE: TOAST individual
// ─────────────────────────────────────────────────────────────────
const Toast = ({ id, type, title, message, onRemove }) => {
  const cfg = CONFIG[type] || CONFIG.info;
  const Icon = cfg.icon;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), 4000);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  return (
    <div className={`toast toast-${type}`} style={{ borderLeftColor: cfg.color }}>
      <div className="toast-icon" style={{ color: cfg.color, background: cfg.bg }}>
        <Icon size={18} />
      </div>
      <div className="toast-body">
        {title && <p className="toast-title">{title}</p>}
        {message && <p className="toast-message">{message}</p>}
      </div>
      <button className="toast-close" onClick={() => onRemove(id)}>
        <X size={14} />
      </button>
      <div className="toast-progress" style={{ background: cfg.color }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// COMPONENTE: MODAL centrado
// ─────────────────────────────────────────────────────────────────
const Modal = ({ modal, onClose }) => {
  const cfg = CONFIG[modal.type] || CONFIG.info;
  const Icon = cfg.icon;

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && !modal.persistent) onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [modal.persistent, onClose]);

  return (
    <div className="modal-overlay" onClick={modal.persistent ? undefined : onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        {/* Ícono animado */}
        <div className="modal-icon-wrapper" style={{ background: cfg.bg }}>
          <div className="modal-icon-pulse" style={{ background: cfg.bg }} />
          <Icon size={32} className="modal-icon" style={{ color: cfg.color }} />
        </div>

        {/* Contenido */}
        <h2 className="modal-title">{modal.title}</h2>
        {modal.message && <p className="modal-message">{modal.message}</p>}

        {/* Contenido personalizado (ej: formulario de cambio de contraseña) */}
        {modal.children && <div className="modal-custom-content">{modal.children}</div>}

        {/* Botones */}
        <div className="modal-actions">
          {modal.type === 'confirm' ? (
            <>
              <button
                className="modal-btn modal-btn-secondary"
                onClick={() => { modal.onCancel?.(); onClose(); }}
              >
                {modal.cancelLabel || 'Cancelar'}
              </button>
              <button
                className="modal-btn modal-btn-primary"
                style={{ background: cfg.color }}
                onClick={() => { modal.onConfirm?.(); onClose(); }}
              >
                {modal.confirmLabel || 'Confirmar'}
              </button>
            </>
          ) : (
            !modal.hideClose && (
              <button
                className="modal-btn modal-btn-primary"
                style={{ background: cfg.color }}
                onClick={() => { modal.onConfirm?.(); onClose(); }}
              >
                {modal.confirmLabel || 'Entendido'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// PROVIDER GLOBAL - Envuelve toda la aplicación
// ─────────────────────────────────────────────────────────────────
export const UIProvider = ({ children }) => {
  const [toasts, setToasts]   = useState([]);
  const [modal, setModal]     = useState(null);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /**
   * Muestra un Toast pequeño en la esquina.
   * @param {{ type: 'success'|'error'|'warning'|'info', title?: string, message?: string }} opts
   */
  const showToast = useCallback((opts) => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-4), { id, ...opts }]); // máx 5 toasts
  }, []);

  /**
   * Muestra un Modal centrado.
   * @param {{ type, title, message, children?, persistent?, hideClose?, confirmLabel?, cancelLabel?, onConfirm?, onCancel? }} opts
   */
  const showModal = useCallback((opts) => {
    setModal(opts);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  return (
    <UIContext.Provider value={{ showToast, showModal, closeModal }}>
      {children}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} {...t} onRemove={removeToast} />
        ))}
      </div>

      {/* Modal */}
      {modal && <Modal modal={modal} onClose={closeModal} />}
    </UIContext.Provider>
  );
};
