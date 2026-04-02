import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, Input, Button } from '../components/ui';
import { Search, User, MapPin } from 'lucide-react';

const BuscadorCliente = () => {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleBuscar = (e) => {
    e.preventDefault();
    if (!codigo) return;
    
    setLoading(true);
    // Mock API call
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

  const handleContinuar = () => {
    navigate('/dashboard');
  };

  return (
    <div>
      <Header />
      <div className="layout-container animate-fade-in">
        <div style={{ maxWidth: '600px', margin: '3rem auto 0' }}>
          <h1 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Buscar Orden de Trabajo</h1>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem' }}>
            Ingresa el código de pedido o cliente para iniciar el registro.
          </p>

          <Card style={{ marginBottom: '2rem' }}>
            <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Input 
                  label="Código de Pedido / Cliente" 
                  placeholder="Ej: WIN-849201" 
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} style={{ height: '48px' }}>
                {loading ? 'Buscando...' : <><Search size={18} /> Buscar</>}
              </Button>
            </form>
          </Card>

          {cliente && (
            <div className="animate-fade-in">
              <Card style={{ border: '1px solid var(--win-orange)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{
                    background: 'rgba(255, 107, 0, 0.1)',
                    padding: '1rem',
                    borderRadius: '50%',
                    color: 'var(--win-orange)'
                  }}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{cliente.nombre}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{cliente.plan}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={14} /> {cliente.direccion}
                    </p>
                  </div>
                </div>
                
                <div style={{ background: '#2A2A2A', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tipo de Servicio:</span>
                  <span style={{ fontWeight: 600 }}>{cliente.tipo}</span>
                </div>

                <Button style={{ width: '100%' }} onClick={handleContinuar}>
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
