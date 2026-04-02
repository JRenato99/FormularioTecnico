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
        nombre: 'Carlos Augusto Rivera',
        plan: '1000 Mbps - Fibra',
        direccion: 'Av. Javier Prado Este 1234, San Borja, Lima',
        tipo: 'Instalación Nueva'
      });
      setLoading(false);
    }, 800);
  };

  /**
   * Redirige al técnico hacia la topología tras verificar el cliente.
   */
  const handleContinuar = () => {
    navigate('/dashboard');
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
                    <h3 className="cliente-nombre">{cliente.nombre}</h3>
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

                <Button className="continuar-btn" onClick={handleContinuar}>
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
