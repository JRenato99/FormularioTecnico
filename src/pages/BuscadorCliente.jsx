import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, Input, Button } from '../components/ui';
import { Search, User, MapPin } from 'lucide-react';
import './BuscadorCliente.css'; 

/**
 * Componente principal del módulo de Autenticación/Ruteo de Visita.
 * 
 * Funciona como una barrera de inicialización lógica. El técnico debe proveer
 * un código de Orden de Trabajo (OT) válido. Tras "validar" vía mock (simulando backend),
 * obliga a designar el factor de forma de la locación (Casa o Departamento) y empuja
 * toda esta data vía Router State hacia el componente principal de reportes.
 * 
 * @component
 * @example
 * return <BuscadorCliente />
 */
const BuscadorCliente = () => {
  const navigate = useNavigate();
  
  // ==========================================
  // ESTADOS DEL COMPONENTE
  // ==========================================

  /** @type {[string, function]} Código ingresado manualmente por el teclado */
  const [codigo, setCodigo] = useState('');
  
  /** @type {[object|null, function]} Representa al payload del cliente extraído de base de datos */
  const [cliente, setCliente] = useState(null);
  
  /** @type {[boolean, function]} Bandera para suspender clicks múltiples mientras resuelve red */
  const [loading, setLoading] = useState(false);
  
  /** @type {[string, function]} Selector crítico de forma geométrica del predio ('Casa' | 'Departamento') */
  const [tipoVivienda, setTipoVivienda] = useState('');

  // ==========================================
  // MANEJADORES DE EVENTOS
  // ==========================================

  /**
   * Captura el Evento Submit del buscador.
   * Evita recarga, activa el booleano `loading` y expone un timeout (como Promise falsa)
   * que rellenará el diccionario de cliente simulando una base SQL real.
   * 
   * @param {React.FormEvent<HTMLFormElement>} e Evento estándar del DOM.
   */
  const handleBuscar = (e) => {
    e.preventDefault();
    if (!codigo) return;
    
    setLoading(true);
    
    // Mock Async API Simulation
    setTimeout(() => {
      setCliente({
        codigo: codigo, // Reciclamos el código exacto ingresado en vez de hardcodear nombre
        plan: '1000 Mbps - Fibra',
        direccion: 'Av. Javier Prado Este 1234, San Borja, Lima',
        tipo: 'Instalación Nueva'
      });
      setLoading(false);
    }, 800);
  };

  /**
   * Consolida la revisión y autoriza el cambio de vista hacia el "Dashboard Central".
   * Este método inyecta un objeto State directamente dentro de la memoria de `react-router-dom`
   * evadiendo parámetros expuestos en URL (?codigo=xxx), manteniéndolo seguro.
   */
  const handleContinuar = () => {
    if (!tipoVivienda) {
      alert("Por favor, selecciona si es Casa o Departamento antes de continuar.");
      return;
    }
    
    // El payload transporta variables al hijo mediante enrutador en memoria
    navigate('/dashboard', { state: { codigo: cliente.codigo, tipoVivienda } });
  };

  // ==========================================
  // RENDERIZADO (UI)
  // ==========================================

  return (
    <div>
      <Header />
      <div className="layout-container animate-fade-in">
        <div className="buscador-wrapper">
          <h1 className="buscador-title">Buscar Orden de Trabajo</h1>
          <p className="buscador-subtitle">
            Ingresa el código de pedido o cliente para iniciar el registro.
          </p>

          <Card className="buscador-card">
            <form onSubmit={handleBuscar} className="buscador-form">
              <div className="buscador-input-container">
                <Input 
                  label="Código de Pedido / Cliente" 
                  placeholder="Ej: WIN-849201" 
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="buscador-btn">
                {loading ? 'Buscando...' : <><Search size={18} /> Buscar</>}
              </Button>
            </form>
          </Card>

          {/* Bloque Inyectado Condicional: Solo despliega al encontrar info de BD */}
          {cliente && (
            <div className="animate-fade-in">
              <Card className="cliente-card">
                <div className="cliente-header">
                  <div className="cliente-icon-bg">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="cliente-nombre">Orden / Cliente: {cliente.codigo}</h3>
                    <p className="cliente-plan">{cliente.plan}</p>
                    <p className="cliente-direccion">
                      <MapPin size={14} /> {cliente.direccion}
                    </p>
                  </div>
                </div>
                
                <div className="cliente-info-box">
                  <span className="cliente-info-label">Tipo de Servicio:</span>
                  <span className="cliente-info-value">{cliente.tipo}</span>
                </div>

                {/* Sector Selección de Vivienda Catenado (Requerimiento de Negocio) */}
                <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', background: 'rgba(255, 107, 0, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                  <h4 style={{ marginBottom: '0.8rem', color: 'var(--text-primary)', fontSize: '0.95rem' }}>Tipo de Domicilio (*)</h4>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <input 
                        type="radio" 
                        name="vivienda" 
                        value="Casa" 
                        checked={tipoVivienda === 'Casa'} 
                        onChange={(e) => setTipoVivienda(e.target.value)} 
                        style={{ accentColor: 'var(--win-orange)', width: '16px', height: '16px' }}
                      />
                      <span>Casa</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <input 
                        type="radio" 
                        name="vivienda" 
                        value="Departamento" 
                        checked={tipoVivienda === 'Departamento'} 
                        onChange={(e) => setTipoVivienda(e.target.value)} 
                        style={{ accentColor: 'var(--win-orange)', width: '16px', height: '16px' }}
                      />
                      <span>Departamento</span>
                    </label>
                  </div>
                </div>

                <Button className="continuar-btn" onClick={handleContinuar} disabled={!tipoVivienda}>
                  Iniciar Mediciones
                </Button>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuscadorCliente;
