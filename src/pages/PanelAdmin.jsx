import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, Button, Input, Select } from '../components/ui';
import { 
  CheckCircle, XCircle, FileText, Send, Clock, User, Filter, 
  AlertCircle, Users, HardDrive, ChevronDown, ChevronUp, 
  Router as RouterIcon, Globe, Tv, Trash2, ShieldOff, Shield,
  Plus, Wifi, Download, Key
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import TopologiaRed from '../components/features/TopologiaRed';
import { getSession, getUsers, addUser, toggleBlock, deleteUser, crearNotificacion, addAuditLog, resetUserPassword } from '../utils/authService';
import { getOrders, updateOrderStatus } from '../utils/databaseService';
import { useUI } from '../components/ui/Modal.jsx';
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
  const { showModal, showToast } = useUI();
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
  const [newUser, setNewUser]           = useState({ email: '', nombre: '', password: '', role: 'TECNICO', cuadrilla: '' });
  const [userError, setUserError]       = useState('');
  // Estado para modal de reset de contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTarget, setResetTarget]       = useState(null);
  const [resetPwd, setResetPwd]             = useState('');

  // ─── Modal de motivo de rechazo ───────────────────────────────────────
  const [showRechazoModal, setShowRechazoModal] = useState(false);
  const [ordenParaRechazar, setOrdenParaRechazar] = useState(null);
  const [motivoRechazo, setMotivoRechazo]       = useState('');

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
      getUsers().then(setUsuarios);
    }
  }, [navigate]);

  // ─── Carga de órdenes desde Supabase ───────────────────────────────────
  const cargarOrdenes = async () => {
    const data = await getOrders();
    setOrdenes(data);
    // Extraer cuadrillas únicas para el filtro
    const cuadrillas = new Set();
    data.forEach(o => { if (o.tecnicoCuadrilla) cuadrillas.add(o.tecnicoCuadrilla); });
    setListaCuadrillas(Array.from(cuadrillas));
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

  // ─── Aprobar Orden (Supabase) ─────────────────────────────────────────
  const aprobarOrden = async (codigoCliente) => {
    const orden = ordenes.find(o => o.codigoCliente === codigoCliente);
    const result = await updateOrderStatus(codigoCliente, 'APROBADO');
    if (!result.success) { showToast({ type: 'error', title: 'Error', message: result.error }); return; }

    setOrdenes(prev => prev.map(o =>
      o.codigoCliente === codigoCliente ? { ...o, status: 'APROBADO' } : o
    ));
    if (orden?.tecnicoEmail) crearNotificacion(orden.tecnicoEmail, 'APROBADO', codigoCliente);
    addAuditLog('APROBAR', 'ORDEN', codigoCliente, { gestionadoPor: session.email });
    showToast({ type: 'success', title: 'Orden Aprobada', message: `Orden ${codigoCliente} aprobada exitosamente.` });
  };

  // ─── Abrir modal de rechazo ───────────────────────────────────────────
  const abrirModalRechazo = (orden) => {
    setOrdenParaRechazar(orden);
    setMotivoRechazo('');
    setShowRechazoModal(true);
  };

  // ─── Confirmar rechazo con motivo (Supabase) ─────────────────────────
  const confirmarRechazo = async () => {
    if (!motivoRechazo.trim()) { showToast({ type: 'warning', title: 'Campo requerido', message: 'Debes ingresar el motivo del rechazo.' }); return; }
    const codigoCliente = ordenParaRechazar.codigoCliente;

    const result = await updateOrderStatus(codigoCliente, 'RECHAZADO');
    if (!result.success) { showToast({ type: 'error', title: 'Error', message: result.error }); return; }

    setOrdenes(prev => prev.map(o =>
      o.codigoCliente === codigoCliente
        ? { ...o, status: 'RECHAZADO', motivoRechazo: motivoRechazo.trim() }
        : o
    ));
    if (ordenParaRechazar?.tecnicoEmail) {
      crearNotificacion(ordenParaRechazar.tecnicoEmail, 'RECHAZADO', codigoCliente, motivoRechazo.trim());
    }
    addAuditLog('RECHAZAR', 'ORDEN', codigoCliente, { motivo: motivoRechazo.trim(), gestionadoPor: session.email });
    showToast({ type: 'info', title: 'Orden Rechazada', message: `Orden ${codigoCliente} rechazada.` });
    setShowRechazoModal(false);
    setOrdenParaRechazar(null);
    setMotivoRechazo('');
  };

  // ─── Descarga de CSV y PDF ─────────────────────────────────────────────
  const descargarCSV = (orden) => {
    if (!orden.csvContent) return alert('No hay contenido CSV para esta orden.');
    const blob = new Blob(['\uFEFF' + orden.csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    // Nomenclatura con fecha
    const ahora = new Date(orden.fechaGuardado || Date.now());
    const dd = String(ahora.getDate()).padStart(2, '0');
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const aa = String(ahora.getFullYear()).slice(2);
    link.download = `${orden.codigoCliente}-${dd}-${mm}-${aa}-mediciones.csv`;
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
  const handleAddUser = async () => {
    setUserError('');
    const result = await addUser(newUser);
    if (!result.success) { setUserError(result.error); return; }
    getUsers().then(setUsuarios);
    setShowAddUser(false);
    setNewUser({ email: '', nombre: '', password: '', role: 'TECNICO', cuadrilla: '' });
    showToast({ type: 'success', title: 'Usuario creado', message: `${newUser.email} fue creado exitosamente. Deberá crear su contraseña al primer ingreso.` });
  };

  const handleToggleBlock = async (email) => {
    const result = await toggleBlock(email);
    if (!result.success) { showModal({ type: 'error', title: 'Error', message: result.error }); return; }
    getUsers().then(setUsuarios);
    showToast({ type: 'info', title: 'Usuario actualizado', message: `Estado del usuario ${email} fue modificado.` });
  };

  const handleDeleteUser = async (email) => {
    showModal({
      type: 'confirm',
      title: '¿Eliminar Usuario?',
      message: `¿Estás seguro de eliminar a "${email}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        const result = await deleteUser(email);
        if (!result.success) { showModal({ type: 'error', title: 'Error', message: result.error }); return; }
        getUsers().then(setUsuarios);
        showToast({ type: 'success', title: 'Usuario eliminado', message: `${email} fue eliminado del sistema.` });
      }
    });
  };

  const handleOpenReset = (email) => {
    setResetTarget(email);
    setResetPwd('');
    setShowResetModal(true);
  };

  const handleResetPassword = async () => {
    const result = await resetUserPassword(resetTarget, resetPwd);
    if (!result.success) { showToast({ type: 'error', title: 'Error', message: result.error }); return; }
    setShowResetModal(false);
    showModal({
      type: 'success',
      title: 'Contraseña Restablecida',
      message: `La cuenta de ${resetTarget} fue marcada para crear nueva contraseña en su próximo ingreso.`
    });
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
    <>
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
                            <Button onClick={() => aprobarOrden(orden.codigoCliente)} style={{ background: '#00C853', color: '#fff', borderColor: '#00C853', fontSize: '0.8rem' }}>
                              <CheckCircle size={14} /> Aprobar
                            </Button>
                            <Button onClick={() => abrirModalRechazo(orden)} style={{ background: '#FF3D00', color: '#fff', borderColor: '#FF3D00', fontSize: '0.8rem' }}>
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

                    {/* Mostrar motivo de rechazo si la orden fue rechazada */}
                    {orden.status === 'RECHAZADO' && orden.motivoRechazo && (
                      <div style={{ margin: '0.5rem 0', padding: '10px 14px', background: 'rgba(255,61,0,0.08)', border: '1px solid rgba(255,61,0,0.25)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <strong style={{ color: '#FF3D00' }}>⛔ Motivo del Rechazo:</strong>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>{orden.motivoRechazo}</p>
                        {orden.gestionadoPor && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.6 }}>Por: {orden.gestionadoPor}</p>
                        )}
                      </div>
                    )}

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
                    <Input label="Nombre completo" placeholder="Juan Pérez" value={newUser.nombre} onChange={e => setNewUser({...newUser, nombre: e.target.value})} />
                    <Input label="Contraseña temporal" type="password" placeholder="El usuario la cambiará al ingresar" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                    <Select label="Rol" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} options={[
                      { label: 'Técnico', value: 'TECNICO' },
                      { label: 'Supervisor', value: 'SUPERVISOR' },
                      { label: 'Administrador', value: 'ADMINISTRADOR' }
                    ]} />
                    {newUser.role === 'TECNICO' && (
                      <Input label="Cuadrilla" placeholder="LIMA-NTE-01" value={newUser.cuadrilla} onChange={e => setNewUser({...newUser, cuadrilla: e.target.value})} />
                    )}
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
                                <button className="icon-action-btn" onClick={() => handleOpenReset(u.email)} title="Restablecer contraseña" style={{ color: '#1E90FF' }}>
                                  <Key size={16} />
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

    {/* ─── MODAL DE RECHAZO ────────────────────────────────────────────── */}
    {showRechazoModal && ordenParaRechazar && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <Card style={{ width: '100%', maxWidth: '480px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#FF3D00', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <XCircle size={20} /> Rechazar Orden
            </h3>
            <button onClick={() => setShowRechazoModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Estás rechazando la orden <strong style={{ color: 'var(--text-primary)' }}>{ordenParaRechazar.codigoCliente}</strong> del técnico <strong style={{ color: 'var(--win-orange)' }}>{ordenParaRechazar.tecnicoEmail}</strong>.
          </p>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Motivo del Rechazo (*)</label>
            <textarea
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              placeholder="Ej: Las mediciones de cobertura son insuficientes (menos de 3). Por favor completa el formulario correctamente..."
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowRechazoModal(false)}>
              Cancelar
            </Button>
            <Button style={{ flex: 1, background: '#FF3D00', color: '#fff', borderColor: '#FF3D00' }} onClick={confirmarRechazo}>
              <XCircle size={16} /> Confirmar Rechazo
            </Button>
          </div>
        </Card>
      </div>
    )}
    {/* ─── MODAL DE RESET DE CONTRASEÑA ──────────────────────────────── */}
    {showResetModal && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <Card style={{ width: '100%', maxWidth: '420px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#1E90FF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={20} /> Restablecer Contraseña
            </h3>
            <button onClick={() => setShowResetModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.4rem' }}>×</button>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Asigna una <strong style={{ color: 'var(--text-primary)' }}>contraseña temporal</strong> para <strong style={{ color: '#1E90FF' }}>{resetTarget}</strong>. El usuario deberá cambiarla en su próximo ingreso.
          </p>
          <Input
            label="Nueva Contraseña Temporal (*)"
            type="password"
            placeholder="Mín. 8 chars, mayúscula, número y símbolo"
            value={resetPwd}
            onChange={e => setResetPwd(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowResetModal(false)}>Cancelar</Button>
            <Button style={{ flex: 1, background: '#1E90FF', borderColor: '#1E90FF' }} onClick={handleResetPassword}>
              <Key size={16} /> Confirmar Reset
            </Button>
          </div>
        </Card>
      </div>
    )}
    </>
  );
};

export default PanelAdmin;
