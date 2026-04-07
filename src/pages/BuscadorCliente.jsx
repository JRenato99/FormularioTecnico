import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, Input, Button } from '../components/ui';
import { Search, User, MapPin } from 'lucide-react';
import './BuscadorCliente.css'; // Importación de clases encapsuladas

/**
 * Componente BuscadorCliente
 * Pantalla de validación en la cual el usuario ingresa el código del cliente para abrir el flujo de trabajo.
 */
const BuscadorCliente = () => {
  const navigate = useNavigate();
  
  // Estado para capturar la escritura del técnico y el cliente encontrado
  const [codigo, setCodigo] = useState('');
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tipoVivienda, setTipoVivienda] = useState(''); // Estado para Casa/Departamento

  /**
   * Obtiene la orden del backend utilizando el código.
   * Se simula mediante setTimeout un loading (carga de red).
   */
  const handleBuscar = (e) => {
    e.preventDefault();
    if (!codigo) return;
    
    setLoading(true);
    
    // Mock de llamada asíncrona a API del cliente
    setTimeout(() => {
      setCliente({
        codigo: codigo,
        plan: '1000 Mbps - Fibra',
        direccion: 'Av. Javier Prado Este 1234, San Borja, Lima',
        tipo: 'Instalación Nueva'
      });
      setLoading(false);
    }, 800);
  };

  /**
   * Redirige al técnico hacia la topología tras verificar el cliente y la vivienda.
   */
  const handleContinuar = () => {
    if (!tipoVivienda) {
      alert("Por favor, selecciona si es Casa o Departamento antes de continuar.");
      return;
    }
    
    // Pasamos el código de cliente dinámicamente mediante el router state
    navigate('/dashboard', { state: { codigo: cliente.codigo, tipoVivienda } });
  };

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

          {/* Renderizado Condicional: Solo muestra la UI del cliente si se encontró */}
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

                {/* Sector Selección de Vivienda Requirido */}
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
