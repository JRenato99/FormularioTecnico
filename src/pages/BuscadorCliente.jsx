import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, Input, Button } from '../components/ui';
import { Search, User, MapPin, List, Clock, CheckCircle, Send, FileText, XCircle, Bell, Edit2 } from 'lucide-react';
import { getSession } from '../utils/authService';
import { supabase } from '../utils/supabaseClient';
import { getOrders } from '../utils/databaseService';
import { useUI } from '../components/ui/Modal.jsx';
import './BuscadorCliente.css'; 

/**
 * Componente principal del módulo de Autenticación/Ruteo de Visita y visor de historial local.
 */
const BuscadorCliente = () => {
  const { showToast } = useUI();
  const navigate = useNavigate();
  
  const [codigo, setCodigo] = useState('');
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tipoVivienda, setTipoVivienda] = useState('');
  const [historial, setHistorial] = useState([]);
  const [tecnico, setTecnico] = useState(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { navigate('/login'); return; }
    setTecnico(session);

    const cargarMias = () => {
      getOrders().then(data => {
        const miasOrdenes = data.filter(o => o.tecnicoEmail === session.email);
        setHistorial(miasOrdenes);
      });
    };

    cargarMias();

    // ─── REALTIME SUBSCRIPTION ──────────────────────────────────────────
    // Suscribirse a cambios en las órdenes para refrescar historial sin F5
    const channel = supabase
      .channel('buscador-realtime')
      .on('postgres_changes', { event: '*', table: 'win_orders', schema: 'public' }, (payload) => {
        cargarMias();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const handleBuscar = async (e) => {
    e.preventDefault();
    if (!codigo) return;
    setLoading(true);
    
    try {
      // Validar si el código de pedido ya existe en la base de datos general
      const { data, error } = await supabase
        .from('win_orders')
        .select('codigoCliente, tecnicoEmail, status')
        .eq('codigoCliente', codigo);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const ordenExistente = data[0];
        
        // Si la orden ya existe y es del mismo técnico, le permitimos continuar (handleContinuar validará si puede editarla)
        if (ordenExistente.tecnicoEmail === tecnico?.email) {
            setCliente({
              codigo: codigo,
              plan: 'Servicio Fibra WIN (Orden Existente)',
              direccion: 'Dirección confirmada en registro',
              tipo: `Estado: ${ordenExistente.status}`
            });
        } else {
            // La orden existe y pertenece a otro técnico
            showToast({ 
              type: 'error', 
              title: 'Código Duplicado', 
              message: `El código ${codigo} ya fue registrado por otro técnico.` 
            });
            setCliente(null);
        }
      } else {
        // La orden NO existe, puede iniciar un registro nuevo
        setCliente({
          codigo: codigo,
          plan: 'Servicio FTTH (Por verificar)',
          direccion: 'Dirección por confirmar en visita',
          tipo: 'Instalación Nueva'
        });
      }
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Error de red', message: 'No se pudo verificar el código de pedido.' });
    } finally {
      setLoading(false);
    }
  };

  const handleContinuar = () => {
    if (!tipoVivienda) {
      showToast({ type: 'warning', title: 'Falta información', message: "Por favor, selecciona si es Casa o Departamento antes de continuar." });
      return;
    }

    // Validación de integridad: Verificar si ya existe en el historial del técnico
    const ordenExistente = historial.find(o => o.codigoCliente === cliente.codigo);
    
    if (ordenExistente) {
      if (ordenExistente.status === 'APROBADO') {
        showToast({ type: 'error', title: 'Orden Bloqueada', message: 'Esta orden ya fue APROBADA por el supervisor. No se puede modificar.' });
        return;
      }
      
      if (ordenExistente.status === 'PENDIENTE') {
        showToast({ type: 'warning', title: 'Aviso de Sobrescritura', message: 'Esta orden está en revisión. Al continuar, podrías sobrescribir los datos enviados.' });
        // Opcional: podríamos cargar los datos aquí, pero como es PENDIENTE, normalmente el técnico no debería editarla.
      }
      
      if (ordenExistente.status === 'RECHAZADO') {
        // Redirigir automáticamente usando el flujo de edición correcto para no perder la ordenPrevia
        handleEditarRechazada(ordenExistente);
        return;
      }
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
      case 'PENDIENTE': return <Send size={16} color="#1E90FF" />;
      case 'APROBADO': return <CheckCircle size={16} color="#00C853" />;
      case 'RECHAZADO': return <XCircle size={16} color="#FF3D00" />;
      default: return null;
    }
  };

  /**
   * Abre el formulario en modo edición para una orden rechazada.
   * Carga los datos previos de la orden en el formulario via state.
   */
  const handleEditarRechazada = (orden) => {
    navigate('/formulario', { 
      state: { 
        codigo: orden.codigoCliente,
        tipoVivienda: orden.tipoVivienda || 'Casa',
        modoEdicion: true,
        ordenPrevia: orden
      }
    });
  };



  return (
    <div>
      <Header />
      <div className="layout-container animate-fade-in">
        <div className="buscador-wrapper">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
            <div>
              <h1 className="buscador-title">Buscar Orden de Trabajo</h1>
              <p className="buscador-subtitle">
                Ingresa el código de pedido (solo números) para iniciar el registro.
              </p>
            </div>
          </div>
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

                    {/* Motivo de rechazo visible para el técnico — viene de Supabase */}
                    {orden.status === 'RECHAZADO' && (
                      <div style={{ padding: '10px 14px', background: 'rgba(255,61,0,0.08)', border: '1px solid rgba(255,61,0,0.2)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <strong style={{ color: '#FF3D00' }}>⛔ Motivo del Rechazo:</strong>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                          {orden.motivoRechazo
                            ? orden.motivoRechazo
                            : 'El supervisor no especificó un motivo. Contacta a tu coordinador.'}
                        </p>
                      </div>
                    )}

                    {/* Botón de Editar solo para órdenes RECHAZADAS */}
                    {orden.status === 'RECHAZADO' && (
                      <Button 
                        onClick={() => handleEditarRechazada(orden)} 
                        style={{ alignSelf: 'flex-start', background: 'rgba(255,107,0,0.12)', border: '1px solid var(--win-orange)', color: 'var(--win-orange)', fontSize: '0.85rem' }}
                      >
                        <Edit2 size={14} /> Editar y Corregir Formulario
                      </Button>
                    )}

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
