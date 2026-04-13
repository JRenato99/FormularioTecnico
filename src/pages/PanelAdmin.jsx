import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, Button, Input } from '../components/ui';
import { CheckCircle, XCircle, FileText, Send, Clock, User, Filter, AlertCircle, Users, HardDrive } from 'lucide-react';
import './PanelAdmin.css';

const PanelAdmin = () => {
  const navigate = useNavigate();
  const [ordenes, setOrdenes] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroCuadrilla, setFiltroCuadrilla] = useState('TODAS');
  
  // Pestañas: 'ORDENES' | 'USUARIOS'
  const [activeTab, setActiveTab] = useState('ORDENES');

  // Lista dinámica de cuadrillas
  const [listaCuadrillas, setListaCuadrillas] = useState([]);

  // Mock Usuarios
  const [usuariosMock, setUsuariosMock] = useState([
    { email: 'tecnico1@win.pe', rol: 'TECNICO', cuadrilla: 'LIMA-NTE-01', estado: 'Activo' },
    { email: 'jrodriguez@win.pe', rol: 'TECNICO', cuadrilla: 'LIMA-SUR-05', estado: 'Activo' },
    { email: 'psuarez@win.pe', rol: 'TECNICO', cuadrilla: 'LIMA-ESTE-03', estado: 'Inactivo' },
    { email: 'admin', rol: 'SUPERVISOR', cuadrilla: 'GERENCIA', estado: 'Activo' }
  ]);

  // Validar sesión de admin
  useEffect(() => {
    const sessionStr = localStorage.getItem('win_session');
    if (!sessionStr) {
      navigate('/login');
      return;
    }
    const session = JSON.parse(sessionStr);
    if (session.role !== 'SUPERVISOR') {
      navigate('/buscar');
    } else {
      cargarOrdenes();
    }
  }, [navigate]);

  const cargarOrdenes = () => {
    const stored = localStorage.getItem('win_orders');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setOrdenes(parsed.reverse());
        
        // Extraer cuadrillas únicas para el filtro
        const cuadrillas = new Set();
        parsed.forEach(o => {
          if (o.tecnicoCuadrilla) cuadrillas.add(o.tecnicoCuadrilla);
        });
        setListaCuadrillas(Array.from(cuadrillas));

      } catch (e) {
        setOrdenes([]);
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'EN PROCESO': return <Clock size={16} color="#ffa500" />;
      case 'ENVIADO': return <Send size={16} color="#1E90FF" />;
      case 'APROBADO': return <CheckCircle size={16} color="#00C853" />;
      case 'RECHAZADO': return <XCircle size={16} color="#FF3D00" />;
      default: return null;
    }
  };

  const cambiarEstado = (idOrden, nuevoEstado) => {
    const stored = localStorage.getItem('win_orders');
    if (!stored) return;
    try {
      let orders = JSON.parse(stored);
      const actualizadas = ordenes.map(o => {
        if (o.codigoCliente === idOrden) { 
          return { ...o, status: nuevoEstado };
        }
        return o;
      });
      // Voltear de vuelta al orden original para guardar
      localStorage.setItem('win_orders', JSON.stringify(actualizadas.slice().reverse()));
      setOrdenes(actualizadas);
    } catch(e) {}
  };

  const descargarCSV = (orden) => {
    // Reparado con Blob y compatibilidad Excel BOM para evitar caracteres raros
    if (orden.csvContent) {
      const blob = new Blob(["\uFEFF" + orden.csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `WIN_REPORTE_${orden.codigoCliente}_${new Date().getTime()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("No hay contenido CSV respaldado para esta orden antigua.");
    }
  };

  const toogleEstadoUsuario = (email) => {
     if(email === 'admin') return alert('No puedes desactivar a Gerencia.');
     setUsuariosMock(usuariosMock.map(u => u.email === email ? {...u, estado: u.estado === 'Activo' ? 'Inactivo' : 'Activo'} : u));
  };

  const ordenesFiltradas = ordenes.filter(
    o => (filtroEstado === 'TODOS' || o.status === filtroEstado) &&
         (filtroCuadrilla === 'TODAS' || o.tecnicoCuadrilla === filtroCuadrilla)
  );

  return (
    <div className="panel-admin-container">
      <Header />
      <div className="admin-wrapper animate-fade-in">
        
        <div className="admin-header-section">
          <div>
            <h1 className="admin-title">Panel de Supervisión</h1>
            <p className="admin-subtitle">Gestión y aprobación de reportes técnicos locales.</p>
          </div>
          <div className="admin-stats">
            <div className="stat-card" style={{ cursor: 'pointer', border: activeTab === 'ORDENES' ? '1px solid var(--win-orange)' : '' }} onClick={() => setActiveTab('ORDENES')}>
              <span className="stat-value"><HardDrive size={24} /></span>
              <span className="stat-label">Gestión Órdenes</span>
            </div>
            <div className="stat-card" style={{ cursor: 'pointer', border: activeTab === 'USUARIOS' ? '1px solid var(--win-blue-light)' : '' }} onClick={() => setActiveTab('USUARIOS')}>
              <span className="stat-value" style={{ color: 'var(--win-blue-light)' }}><Users size={24} /></span>
              <span className="stat-label">Usuarios</span>
            </div>
          </div>
        </div>

        {activeTab === 'ORDENES' && (
          <>
            <Card className="filter-card" style={{ flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Filter size={18} color="var(--text-secondary)" />
                <span style={{color: 'var(--text-secondary)'}}>Filtrar por estado: </span>
                <select 
                  className="ui-select" 
                  style={{ width: 'auto', minWidth: '150px', background: 'var(--bg-secondary)' }}
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="TODOS">Todos los Estados</option>
                  <option value="ENVIADO">Pendiente de Revisión (Enviados)</option>
                  <option value="APROBADO">Aprobados</option>
                  <option value="RECHAZADO">Rechazados</option>
                  <option value="EN PROCESO">Borrador (En proceso)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
                <span style={{color: 'var(--text-secondary)'}}>Cuadrilla: </span>
                <select 
                  className="ui-select" 
                  style={{ width: 'auto', minWidth: '150px', background: 'var(--bg-secondary)' }}
                  value={filtroCuadrilla}
                  onChange={(e) => setFiltroCuadrilla(e.target.value)}
                >
                  <option value="TODAS">TODAS LAS CUADRILLAS</option>
                  {listaCuadrillas.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </Card>

            <div className="ordenes-lista">
              {ordenesFiltradas.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} color="rgba(255,255,255,0.1)" />
                  <p>No se encontraron registros bajo los filtros actuales.</p>
                </div>
              ) : (
                ordenesFiltradas.map((orden, idx) => (
                  <Card key={`${orden.codigoCliente}-${idx}`} className="orden-card" style={{ alignItems: 'stretch' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', width: '100%', marginBottom: '1rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <div className="orden-icon"><User size={20} color="var(--win-orange)" /></div>
                          <div>
                            <h3 className="orden-title">Código: {orden.codigoCliente}</h3>
                            <p className="orden-date">Modificado: {new Date(orden.fechaGuardado).toLocaleString()}</p>
                          </div>
                      </div>
                      <div className={`status-badge status-${orden.status?.replace(' ', '-')}`}>
                        {getStatusIcon(orden.status)}
                        <span>{orden.status}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                      
                      {/* Detalles del Técnico Encargado */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        <div><strong>Creado por:</strong> {orden.tecnicoEmail || 'No detectado'}</div>
                        <div><strong>Cuadrilla:</strong> <span style={{ color: 'var(--win-blue-light)' }}>{orden.tecnicoCuadrilla || 'No detectada'}</span></div>
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
                           <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>APs: {orden.equipos ? orden.equipos.length : 0}</span>
                           <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>Locaciones Medidas: {orden.mediciones ? orden.mediciones.length : 0}</span>
                        </div>
                      </div>

                      <div className="orden-actions">
                        <Button variant="secondary" onClick={() => descargarCSV(orden)}>
                          Descargar CSV
                        </Button>
                        
                        {orden.status === 'ENVIADO' && (
                          <div className="approval-actions">
                            <Button onClick={() => cambiarEstado(orden.codigoCliente, 'APROBADO')} style={{ background: '#00C853', color: '#fff', borderColor: '#00C853' }}>
                              <CheckCircle size={16} /> Aprobar
                            </Button>
                            <Button onClick={() => cambiarEstado(orden.codigoCliente, 'RECHAZADO')} style={{ background: '#FF3D00', color: '#fff', borderColor: '#FF3D00' }}>
                              <XCircle size={16} /> Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'USUARIOS' && (
          <div className="animate-fade-in">
             <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--win-blue-light)' }}>Centro de Control de Usuarios</h3>
                  <Button variant="secondary" onClick={() => alert('Módulo de creación conectado a Base de Datos backend pendiente.')}>+ Nuevo Técnico</Button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', background: 'rgba(255, 171, 0, 0.05)', padding: '10px', borderRadius: '8px' }}>
                  <AlertCircle size={18} color="#ffa500" />
                  <span>Por el momento, los cuadros de usuarios son de prueba ya que el sistema actual no cuenta con Base de Datos vinculada a Auth.</span>
                </div>

                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '12px' }}>Correo Electrónico</th>
                        <th style={{ padding: '12px' }}>Rol</th>
                        <th style={{ padding: '12px' }}>Cuadrilla Asignada</th>
                        <th style={{ padding: '12px' }}>Estado</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosMock.map((u, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px' }}>{u.email}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ background: u.rol === 'SUPERVISOR' ? 'var(--win-orange)' : 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{u.rol}</span>
                          </td>
                          <td style={{ padding: '12px' }}>{u.cuadrilla}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ color: u.estado === 'Activo' ? '#00C853' : '#FF3D00', fontWeight: 'bold' }}>{u.estado}</span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {u.rol !== 'SUPERVISOR' && (
                              <Button variant="secondary" onClick={() => toogleEstadoUsuario(u.email)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                                {u.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

             </Card>
          </div>
        )}

      </div>
    </div>
  );
};

export default PanelAdmin;
