import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, Button, Input, Select } from '../components/ui';
import { 
  CheckCircle, XCircle, FileText, Send, Clock, User, Filter, 
  AlertCircle, Users, HardDrive, ChevronDown, ChevronUp, 
  Router as RouterIcon, Globe, Tv, Trash2, ShieldOff, Shield,
  Plus, Wifi, Download
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import TopologiaRed from '../components/features/TopologiaRed';
import { getSession, getUsers, addUser, toggleBlock, deleteUser } from '../utils/authService';
import { getRssiStyle } from '../utils/constants';
import './PanelAdmin.css';

/**
 * PanelAdmin
 * ----------
 * Panel centralizado de supervisión y administración.
 * 
 * Roles soportados:
 *   ADMINISTRADOR → Ve TODAS las órdenes (cualquier estado) + pestaña Usuarios (CRUD).
 *   SUPERVISOR    → Ve órdenes con Aprobar/Rechazar, SIN pestaña Usuarios.
 */
const PanelAdmin = () => {
  const navigate = useNavigate();
  const [session, setSession]             = useState(null);
  const [ordenes, setOrdenes]             = useState([]);
  const [filtroEstado, setFiltroEstado]   = useState('TODOS');
  const [filtroCuadrilla, setFiltroCuadrilla] = useState('TODAS');
  const [activeTab, setActiveTab]         = useState('ORDENES');
  const [listaCuadrillas, setListaCuadrillas] = useState([]);
  
  // Acordeón: índice de la orden expandida (-1 = ninguna)
  const [expandedIndex, setExpandedIndex] = useState(-1);

  // Referencias para la exportación PDF
  const topologiaRefs = React.useRef({});
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // ─── Gestión de Usuarios (solo ADMIN) ──────────────────────────────────
  const [usuarios, setUsuarios]         = useState([]);
  const [showAddUser, setShowAddUser]   = useState(false);
  const [newUser, setNewUser]           = useState({ email: '', password: '', role: 'TECNICO', cuadrilla: '' });
  const [userError, setUserError]       = useState('');

  // ─── Validar sesión ────────────────────────────────────────────────────
  useEffect(() => {
    const sess = getSession();
    if (!sess) { navigate('/login'); return; }
    if (sess.role !== 'SUPERVISOR' && sess.role !== 'ADMINISTRADOR') {
      navigate('/buscar');
      return;
    }
    setSession(sess);
    cargarOrdenes();
    if (sess.role === 'ADMINISTRADOR') {
      setUsuarios(getUsers());
    }
  }, [navigate]);

  // ─── Carga de órdenes desde localStorage ───────────────────────────────
  const cargarOrdenes = () => {
    const stored = localStorage.getItem('win_orders');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      setOrdenes([...parsed].reverse());
      const cuadrillas = new Set();
      parsed.forEach(o => { if (o.tecnicoCuadrilla) cuadrillas.add(o.tecnicoCuadrilla); });
      setListaCuadrillas(Array.from(cuadrillas));
    } catch { setOrdenes([]); }
  };

  // ─── Íconos de estado ──────────────────────────────────────────────────
  const getStatusIcon = (status) => {
    const map = {
      'EN PROCESO': <Clock size={16} color="#ffa500" />,
      'ENVIADO':    <Send size={16} color="#1E90FF" />,
      'APROBADO':   <CheckCircle size={16} color="#00C853" />,
      'RECHAZADO':  <XCircle size={16} color="#FF3D00" />
    };
    return map[status] || null;
  };

  // ─── Cambiar estado de una orden ───────────────────────────────────────
  const cambiarEstado = (codigoCliente, nuevoEstado) => {
    const actualizadas = ordenes.map(o =>
      o.codigoCliente === codigoCliente ? { ...o, status: nuevoEstado } : o
    );
    localStorage.setItem('win_orders', JSON.stringify([...actualizadas].reverse()));
    setOrdenes(actualizadas);
  };

  // ─── Descarga de CSV y PDF ─────────────────────────────────────────────
  const descargarCSV = (orden) => {
    if (!orden.csvContent) return alert('No hay contenido CSV para esta orden.');
    const blob = new Blob(["\uFEFF" + orden.csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `WIN_REPORTE_${orden.codigoCliente}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const descargarPDFTopologia = async (idx, codigoCliente) => {
    const element = topologiaRefs.current[idx];
    if (!element) return;
    setIsExportingPDF(true);
    
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(element, {
          scale: 2, 
          backgroundColor: getComputedStyle(document.body).getPropertyValue('background-color') || '#121212', 
          useCORS: true,
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height] 
        });
        
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save(`Topologia_WIN_${codigoCliente}.pdf`);
      } catch (error) {
        console.error("Error generando PDF", error);
        alert('Hubo un error al generar el PDF. Revisa la consola.');
      } finally {
        setIsExportingPDF(false); 
      }
    }, 100);
  };

  // ─── CRUD de Usuarios ─────────────────────────────────────────────────
  const handleAddUser = () => {
    setUserError('');
    const result = addUser(newUser);
    if (!result.success) { setUserError(result.error); return; }
    setUsuarios(getUsers());
    setShowAddUser(false);
    setNewUser({ email: '', password: '', role: 'TECNICO', cuadrilla: '' });
  };

  const handleToggleBlock = (email) => {
    const result = toggleBlock(email);
    if (!result.success) { alert(result.error); return; }
    setUsuarios(getUsers());
  };

  const handleDeleteUser = (email) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${email}"? Esta acción no se puede deshacer.`)) return;
    const result = deleteUser(email);
    if (!result.success) { alert(result.error); return; }
    setUsuarios(getUsers());
  };

  // ─── Filtrado de órdenes ───────────────────────────────────────────────
  const ordenesFiltradas = ordenes.filter(
    o => (filtroEstado === 'TODOS' || o.status === filtroEstado) &&
         (filtroCuadrilla === 'TODAS' || o.tecnicoCuadrilla === filtroCuadrilla)
  );

  const isAdmin = session?.role === 'ADMINISTRADOR';

  // ─── Título dinámico según rol ─────────────────────────────────────────
  const panelTitle = isAdmin ? 'Panel de Administración' : 'Panel de Supervisión';
  const panelSubtitle = isAdmin 
    ? 'Control total: órdenes, usuarios y reportes.' 
    : 'Revisión y aprobación de reportes técnicos.';

  return (
    <div className="panel-admin-container">
      <Header />
      <div className="admin-wrapper animate-fade-in">
        
        {/* ─── Cabecera ─────────────────────────────────────────────── */}
        <div className="admin-header-section">
          <div>
            <h1 className="admin-title">{panelTitle}</h1>
            <p className="admin-subtitle">{panelSubtitle}</p>
          </div>
          <div className="admin-stats">
            <div 
              className={`stat-card ${activeTab === 'ORDENES' ? 'stat-card--active' : ''}`} 
              onClick={() => setActiveTab('ORDENES')}
            >
              <HardDrive size={22} />
              <span className="stat-label">Órdenes ({ordenes.length})</span>
            </div>
            {isAdmin && (
              <div 
                className={`stat-card stat-card--blue ${activeTab === 'USUARIOS' ? 'stat-card--active-blue' : ''}`} 
                onClick={() => setActiveTab('USUARIOS')}
              >
                <Users size={22} />
                <span className="stat-label">Usuarios</span>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            PESTAÑA: ÓRDENES
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'ORDENES' && (
          <>
            {/* Filtros */}
            <Card className="filter-card">
              <div className="filter-group">
                <Filter size={16} color="var(--text-secondary)" />
                <span className="filter-label">Estado:</span>
                <select className="ui-select filter-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                  <option value="TODOS">Todos</option>
                  <option value="ENVIADO">Enviados (Pendientes)</option>
                  <option value="APROBADO">Aprobados</option>
                  <option value="RECHAZADO">Rechazados</option>
                  <option value="EN PROCESO">En Proceso</option>
                </select>
              </div>
              <div className="filter-group">
                <span className="filter-label">Cuadrilla:</span>
                <select className="ui-select filter-select" value={filtroCuadrilla} onChange={e => setFiltroCuadrilla(e.target.value)}>
                  <option value="TODAS">Todas</option>
                  {listaCuadrillas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </Card>

            {/* Lista de Órdenes */}
            <div className="ordenes-lista">
              {ordenesFiltradas.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} color="rgba(255,255,255,0.1)" />
                  <p>No se encontraron registros con los filtros actuales.</p>
                </div>
              ) : (
                ordenesFiltradas.map((orden, idx) => (
                  <Card key={`${orden.codigoCliente}-${idx}`} className="orden-card">
                    
                    {/* ─── Cabecera de la Orden ──────────────────────── */}
                    <div className="orden-card-header">
                      <div className="orden-card-info">
                        <div className="orden-icon"><User size={18} color="var(--win-orange)" /></div>
                        <div>
                          <h3 className="orden-title">Orden: {orden.codigoCliente}</h3>
                          <p className="orden-date">{new Date(orden.fechaGuardado).toLocaleString()}</p>
                          <p className="orden-meta">
                            <strong>Técnico:</strong> {orden.tecnicoEmail || '—'} · 
                            <span className="orden-cuadrilla"> {orden.tecnicoCuadrilla || '—'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="orden-card-controls">
                        <div className={`status-badge status-${orden.status?.replace(' ', '-')}`}>
                          {getStatusIcon(orden.status)} <span>{orden.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* ─── Badges Resumen + Acciones ──────────────────── */}
                    <div className="orden-summary-row">
                      <div className="orden-badges">
                        <span className="badge"><RouterIcon size={14} /> {orden.equipos?.length || 0} APs</span>
                        <span className="badge"><Globe size={14} /> {orden.mediciones?.length || 0} Mediciones</span>
                        <span className="badge"><Tv size={14} /> {orden.winboxes?.length || 0} Winbox</span>
                        <span className="badge"><Wifi size={14} /> {orden.televisores?.length || 0} WinTV</span>
                      </div>
                      <div className="orden-actions">
                        <Button variant="secondary" onClick={() => descargarCSV(orden)} style={{ fontSize: '0.8rem' }}>
                          CSV
                        </Button>
                        {orden.status === 'ENVIADO' && (
                          <>
                            <Button onClick={() => cambiarEstado(orden.codigoCliente, 'APROBADO')} style={{ background: '#00C853', color: '#fff', borderColor: '#00C853', fontSize: '0.8rem' }}>
                              <CheckCircle size={14} /> Aprobar
                            </Button>
                            <Button onClick={() => cambiarEstado(orden.codigoCliente, 'RECHAZADO')} style={{ background: '#FF3D00', color: '#fff', borderColor: '#FF3D00', fontSize: '0.8rem' }}>
                              <XCircle size={14} /> Rechazar
                            </Button>
                          </>
                        )}
                        <button 
                          className="expand-btn" 
                          onClick={() => setExpandedIndex(expandedIndex === idx ? -1 : idx)}
                          title="Ver detalle completo"
                        >
                          {expandedIndex === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* ─── Panel Expandible: Detalle Completo ─────────── */}
                    {expandedIndex === idx && (
                      <div className="orden-detail animate-fade-in">
                        
                        {/* Topología de Red */}
                        {orden.equipos && orden.equipos.length > 0 && (
                          <div className="detail-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                               <h4 className="detail-title" style={{ margin: 0 }}><RouterIcon size={16} /> Topología de Red</h4>
                               <Button variant="secondary" onClick={() => descargarPDFTopologia(idx, orden.codigoCliente)} disabled={isExportingPDF} style={{ fontSize: '0.8rem' }}>
                                 {isExportingPDF ? 'Generando...' : <><Download size={14} /> PDF Topología</>}
                               </Button>
                            </div>

                            {/* Render visual de Topología (Oculta controles de edición) */}
                            <div ref={el => topologiaRefs.current[idx] = el} style={{ background: 'var(--win-bg-dark)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
                               <TopologiaRed 
                                 equipos={orden.equipos} 
                                 setEquipos={() => {}} 
                                 isExporting={true} 
                                 listaUbicaciones={[]}
                                 onAgregarUbicacion={() => {}}
                               />
                            </div>

                            <div className="detail-table-wrapper">
                              <table className="detail-table">
                                <thead>
                                  <tr>
                                    <th>Equipo</th><th>Tipo</th><th>S/N</th><th>Ambiente</th><th>Piso</th><th>Conexión</th><th>3ro</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orden.equipos.map((eq, i) => (
                                    <tr key={i}>
                                      <td>{eq.nombre}</td>
                                      <td>{eq.tipo}</td>
                                      <td style={{ fontFamily: 'monospace' }}>{eq.serialNumber || '—'}</td>
                                      <td>{eq.ambienteFinal || eq.ubicacion || '—'}</td>
                                      <td>{eq.piso || '—'}</td>
                                      <td>{eq.conexion || 'FO'}</td>
                                      <td style={{ color: eq.esTercero ? '#FF3D00' : '#00C853' }}>{eq.esTercero ? 'SÍ' : 'NO'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Mediciones */}
                        {orden.mediciones && orden.mediciones.length > 0 && (
                          <div className="detail-section">
                            <h4 className="detail-title"><Globe size={16} /> Mediciones de Cobertura</h4>
                            <div className="detail-table-wrapper">
                              <table className="detail-table">
                                <thead>
                                  <tr>
                                    <th>Ambiente</th><th>Piso</th><th>Vel 2.4G</th><th>RSSI 2.4G</th><th>Eval 2.4G</th><th>Vel 5G</th><th>RSSI 5G</th><th>Eval 5G</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orden.mediciones.map((m, i) => {
                                    const eval24 = getRssiStyle(m.rssi24g);
                                    const eval5  = getRssiStyle(m.rssi5g);
                                    return (
                                      <tr key={i}>
                                        <td>{m.ubicacion === 'Otro' ? m.ubicacionPersonalizada : m.ubicacion}</td>
                                        <td>{m.piso}</td>
                                        <td>{m.velocidad24g} Mbps</td>
                                        <td>{m.rssi24g} dBm</td>
                                        <td style={{ color: eval24?.color }}>{eval24?.lbl?.split(' (')[0] || '—'}</td>
                                        <td>{m.velocidad5g} Mbps</td>
                                        <td>{m.rssi5g} dBm</td>
                                        <td style={{ color: eval5?.color }}>{eval5?.lbl?.split(' (')[0] || '—'}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Winboxes */}
                        {orden.winboxes && orden.winboxes.length > 0 && (
                          <div className="detail-section">
                            <h4 className="detail-title"><Tv size={16} /> Decodificadores WINBOX</h4>
                            <div className="detail-table-wrapper">
                              <table className="detail-table">
                                <thead>
                                  <tr><th>S/N</th><th>Ambiente</th><th>Conexión</th><th>Banda</th><th>Vel</th><th>RSSI</th></tr>
                                </thead>
                                <tbody>
                                  {orden.winboxes.map((w, i) => (
                                    <tr key={i}>
                                      <td style={{ fontFamily: 'monospace' }}>{w.serialNumber}</td>
                                      <td>{w.ubicacion === 'Otro' ? w.ubicacionPersonalizada : w.ubicacion}</td>
                                      <td>{w.modoConexion}</td>
                                      <td>{w.modoConexion === 'Inalámbrico' ? w.bandaWifi : '—'}</td>
                                      <td>{w.modoConexion === 'Inalámbrico' ? `${w.velocidad} Mbps` : 'Cable'}</td>
                                      <td>{w.modoConexion === 'Inalámbrico' ? `${w.rssi} dBm` : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* WinTV */}
                        {orden.televisores && orden.televisores.length > 0 && (
                          <div className="detail-section">
                            <h4 className="detail-title"><Wifi size={16} /> Servicios WinTV</h4>
                            <div className="detail-table-wrapper">
                              <table className="detail-table">
                                <thead>
                                  <tr><th>Marca</th><th>Modelo</th><th>Ambiente</th><th>Conexión</th></tr>
                                </thead>
                                <tbody>
                                  {orden.televisores.map((t, i) => (
                                    <tr key={i}>
                                      <td>{t.marca === 'Otro' ? t.marcaPersonalizada : t.marca}</td>
                                      <td>{t.modelo}</td>
                                      <td>{t.ubicacion === 'Otro' ? t.ubicacionPersonalizada : t.ubicacion}</td>
                                      <td>{t.modoConexion}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Sin datos */}
                        {(!orden.equipos || orden.equipos.length === 0) && 
                         (!orden.mediciones || orden.mediciones.length === 0) && (
                          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                            Esta orden no contiene datos de topología ni mediciones registradas.
                          </p>
                        )}
                      </div>
                    )}

                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            PESTAÑA: USUARIOS (solo ADMINISTRADOR)
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'USUARIOS' && isAdmin && (
          <div className="animate-fade-in">
            <Card>
              <div className="users-header">
                <h3 className="users-title">Centro de Control de Usuarios</h3>
                <Button onClick={() => setShowAddUser(!showAddUser)}>
                  <Plus size={16} /> Nuevo Usuario
                </Button>
              </div>

              {/* Formulario Nuevo Usuario */}
              {showAddUser && (
                <div className="add-user-form animate-fade-in">
                  {userError && (
                    <div className="login-error-msg" style={{ marginBottom: '1rem' }}>
                      <AlertCircle size={16} /> <span>{userError}</span>
                    </div>
                  )}
                  <div className="add-user-grid">
                    <Input label="Email / Usuario" placeholder="tecnico@win.pe" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                    <Input label="Contraseña" type="password" placeholder="••••••" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                    <Select label="Rol" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} options={[
                      { label: 'Técnico', value: 'TECNICO' },
                      { label: 'Supervisor', value: 'SUPERVISOR' },
                      { label: 'Administrador', value: 'ADMINISTRADOR' }
                    ]} />
                    <Input label="Cuadrilla" placeholder="LIMA-NTE-01" value={newUser.cuadrilla} onChange={e => setNewUser({...newUser, cuadrilla: e.target.value})} />
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <Button onClick={handleAddUser}>Guardar Usuario</Button>
                    <Button variant="secondary" onClick={() => { setShowAddUser(false); setUserError(''); }}>Cancelar</Button>
                  </div>
                </div>
              )}

              {/* Tabla de Usuarios */}
              <div className="detail-table-wrapper" style={{ marginTop: '1.5rem' }}>
                <table className="detail-table users-table">
                  <thead>
                    <tr>
                      <th>Email</th><th>Rol</th><th>Cuadrilla</th><th>Estado</th><th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u, i) => {
                      const rolColors = { ADMINISTRADOR: '#FF3D00', SUPERVISOR: '#1E90FF', TECNICO: '#00C853' };
                      const isSelf = session?.email === u.email;
                      return (
                        <tr key={i}>
                          <td>{u.email}</td>
                          <td>
                            <span className="header-rol-badge" style={{ color: rolColors[u.role], borderColor: rolColors[u.role] }}>
                              {u.role}
                            </span>
                          </td>
                          <td>{u.cuadrilla}</td>
                          <td>
                            <span style={{ color: u.estado === 'Activo' ? '#00C853' : '#FF3D00', fontWeight: 'bold' }}>
                              {u.estado}
                            </span>
                          </td>
                          <td className="user-actions-cell">
                            {!isSelf && (
                              <>
                                <button className="icon-action-btn" onClick={() => handleToggleBlock(u.email)} title={u.estado === 'Activo' ? 'Bloquear' : 'Desbloquear'}>
                                  {u.estado === 'Activo' ? <ShieldOff size={16} color="#ffa500" /> : <Shield size={16} color="#00C853" />}
                                </button>
                                <button className="icon-action-btn icon-action-btn--danger" onClick={() => handleDeleteUser(u.email)} title="Eliminar usuario">
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                            {isSelf && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tú</span>}
                          </td>
                        </tr>
                      );
                    })}
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
