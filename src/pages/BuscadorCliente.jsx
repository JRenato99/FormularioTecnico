import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, Input, Button } from '../components/ui';
import { Search, User, MapPin, List, Clock, CheckCircle, Send, FileText } from 'lucide-react';
import './BuscadorCliente.css'; 

/**
 * Componente principal del módulo de Autenticación/Ruteo de Visita y visor de historial local.
 */
const BuscadorCliente = () => {
  const navigate = useNavigate();
  
  const [codigo, setCodigo] = useState('');
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tipoVivienda, setTipoVivienda] = useState('');
  const [historial, setHistorial] = useState([]);
  const [tecnico, setTecnico] = useState(null);

  useEffect(() => {
    // Cargar historial de órdenes desde localStorage (Caché local)
    const stored = localStorage.getItem('win_orders');
    if (stored) {
      try {
        setHistorial(JSON.parse(stored));
      } catch (e) {
        console.error("Error leyendo historial", e);
      }
    }
    
    const session = localStorage.getItem('win_session');
    if (session) {
      try {
        setTecnico(JSON.parse(session));
      } catch(e){}
    }
  }, []);

  const handleBuscar = (e) => {
    e.preventDefault();
    if (!codigo) return;
    setLoading(true);
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

  const handleContinuar = () => {
    if (!tipoVivienda) {
      alert("Por favor, selecciona si es Casa o Departamento antes de continuar.");
      return;
    }
    // El payload transporta variables al hijo mediante enrutador en memoria
    navigate('/formulario', { state: { codigo: cliente.codigo, tipoVivienda } });
  };

  const handleCodigoChange = (e) => {
    // Permitir solo números, bloquear letras o caracteres especiales
    const value = e.target.value.replace(/\D/g, '');
    setCodigo(value);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'EN PROCESO': return <Clock size={16} color="#ffa500" />;
      case 'ENVIADO': return <Send size={16} color="#1E90FF" />;
      case 'APROBADO': return <CheckCircle size={16} color="#00C853" />;
      case 'RECHAZADO': return <CheckCircle size={16} color="#FF3D00" />;
      default: return null;
    }
  };

  return (
    <div>
      <Header />
      <div className="layout-container animate-fade-in">
        <div className="buscador-wrapper">
          <h1 className="buscador-title">Buscar Orden de Trabajo</h1>
          <p className="buscador-subtitle">
            Ingresa el código de pedido (solo números) para iniciar el registro.
          </p>

          <Card className="buscador-card">
            <form onSubmit={handleBuscar} className="buscador-form">
              <div className="buscador-input-container">
                <Input 
                  label="Código de Pedido / Cliente" 
                  placeholder="Ej: 849201" 
                  value={codigo}
                  onChange={handleCodigoChange}
                />
              </div>
              <Button type="submit" disabled={loading} className="buscador-btn">
                {loading ? 'Buscando...' : <><Search size={18} /> Buscar</>}
              </Button>
            </form>
          </Card>

          {/* Bloque Inyectado Condicional: Solo despliega al encontrar info de BD */}
          {cliente && (
            <div className="animate-fade-in" style={{ marginTop: '2rem' }}>
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
                  Iniciar Formulario Técnico
                </Button>
              </Card>
            </div>
          )}

          {/* Seccion: Historial de Órdenes Locales */}
          {!cliente && historial.length > 0 && (
            <div className="historial-container animate-fade-in" style={{ marginTop: '3rem' }}>
              
              {/* Información del Técnico */}
              {tecnico && (
                 <Card style={{ marginBottom: '1.5rem', background: 'rgba(255, 107, 0, 0.05)', borderColor: 'var(--win-orange)', display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '1rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                     <User size={18} color="var(--win-orange)" />
                     Técnico Asignado: <span style={{ color: 'var(--win-orange)' }}>{tecnico.email}</span>
                   </div>
                   <div style={{ paddingLeft: '1.8rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                     Cuadrilla de Calle: <strong>{tecnico.cuadrilla}</strong>
                   </div>
                 </Card>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <List size={20} color="var(--text-primary)" />
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: 0 }}>Tus Órdenes Gestionadas</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {historial.slice().reverse().map((orden, idx) => (
                  <Card key={idx} className="historial-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <FileText size={16} /> Orden: {orden.codigoCliente}
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0 0', fontSize: '0.85rem' }}>
                           Fecha: {new Date(orden.fechaGuardado || Date.now()).toLocaleString()}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                        {getStatusIcon(orden.status)}
                        {orden.status}
                      </div>
                    </div>
                    
                    {/* Detalles compactos para evitar que se vea descuadrado en móviles */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--win-blue-light)', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '6px' }}>
                       <span>Equipos: {orden.equipos ? orden.equipos.length : 0}</span>
                       <span>|</span>
                       <span>Mediciones: {orden.mediciones ? orden.mediciones.length : 0}</span>
                       <span>|</span>
                       <span>Winbox: {orden.winboxes ? orden.winboxes.length : 0}</span>
                    </div>

                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuscadorCliente;
