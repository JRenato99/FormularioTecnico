import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card, Button, Input, Select } from '../components/ui';
import {
  CheckCircle, XCircle, FileText, Send, Clock, User, Filter,
  AlertCircle, Users, HardDrive, ChevronDown, ChevronUp,
  Search, Download, Plus, Edit2, Trash2, MoreHorizontal,
  RefreshCw, LogOut, LayoutDashboard, History, Shield,
  Router as RouterIcon, Globe, Tv, ShieldOff, Wifi, Key, Building2, X, RotateCcw
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import TopologiaRed from '../components/features/TopologiaRed';
import { supabase } from '../utils/supabaseClient';
import { getSession, getUsers, addUser, toggleBlock, deleteUser, crearNotificacion, addAuditLog, resetUserPassword, updateSupervisorTipo } from '../utils/authService';
import { getOrders, updateOrderStatus, getAuditLogs, getEmpresas, getCuadrillas, getEmpresasConCuadrillas, addEmpresa, deleteEmpresa, addCuadrilla, deleteCuadrilla } from '../utils/databaseService';
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
  const [filtroFechaAuditoria, setFiltroFechaAuditoria] = useState('');
  
  // Acordeón: índice de la orden expandida (-1 = ninguna)
  const [expandedIndex, setExpandedIndex] = useState(-1);

  // Referencias para la exportación PDF
  const topologiaRefs = React.useRef({});
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // ─── Gestión de Usuarios (solo ADMIN) ──────────────────────────────────
  const [usuarios, setUsuarios]         = useState([]);
  const [auditLogs, setAuditLogs]       = useState([]);
  const [showAddUser, setShowAddUser]   = useState(false);
  const [newUser, setNewUser]           = useState({ email: '', nombre: '', password: '', role: 'TECNICO', cuadrilla: '', supervisor_tipo: '', empresa_id: '', dni: '', telefono: '' });
  const [empresas, setEmpresas]               = useState([]);
  const [cuadrillasForm, setCuadrillasForm]   = useState([]);
  // Gestión de empresas/cuadrillas (pestaña EMPRESAS)
  const [empresasDetalle, setEmpresasDetalle] = useState([]);
  const [newEmpresaNombre, setNewEmpresaNombre] = useState('');
  const [empresaError, setEmpresaError]       = useState('');
  const [newCuadrilla, setNewCuadrilla]       = useState({});  // { [empresaId]: codigo }
  const [userError, setUserError]       = useState('');
  // Estado para modal de reset de contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTarget, setResetTarget]       = useState(null);
  const [resetPwd, setResetPwd]             = useState('');
  // Estado para modal de edición de tipo de supervisor (SGI/SGA)
  const [showEditTipo, setShowEditTipo]     = useState(false);
  const [editTipoTarget, setEditTipoTarget] = useState(null);
  const [editTipoValue, setEditTipoValue]   = useState('SGI');

  // ─── Modal de motivo de rechazo ───────────────────────────────────────
  const [showRechazoModal, setShowRechazoModal] = useState(false);
  const [ordenParaRechazar, setOrdenParaRechazar] = useState(null);
  const [motivoRechazo, setMotivoRechazo]       = useState('');

  // ─── Modal de revertir a PENDIENTE (solo ADMINISTRADOR) ───────────────
  const [showRevertirModal, setShowRevertirModal] = useState(false);
  const [ordenParaRevertir, setOrdenParaRevertir] = useState(null);
  const [motivoRevertir, setMotivoRevertir]       = useState('');

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
      getEmpresas().then(setEmpresas);
      getEmpresasConCuadrillas().then(setEmpresasDetalle);
    }
  }, [navigate]);

  const recargarEmpresas = async () => {
    const [lista, detalle] = await Promise.all([getEmpresas(), getEmpresasConCuadrillas()]);
    setEmpresas(lista);
    setEmpresasDetalle(detalle);
  };

  const handleAddEmpresa = async () => {
    setEmpresaError('');
    if (!newEmpresaNombre.trim()) { setEmpresaError('Ingresa el nombre de la empresa.'); return; }
    const result = await addEmpresa(newEmpresaNombre);
    if (!result.success) { setEmpresaError(result.error); return; }
    setNewEmpresaNombre('');
    await recargarEmpresas();
    showToast({ type: 'success', title: 'Empresa creada', message: `${newEmpresaNombre.toUpperCase()} fue registrada.` });
  };

  const handleDeleteEmpresa = (emp) => {
    showModal({
      type: 'warning',
      title: `Eliminar empresa ${emp.nombre}`,
      message: `¿Seguro? Se eliminarán también todas sus cuadrillas (${(emp.win_cuadrillas || []).length}). Los técnicos asignados quedarán sin empresa.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        const result = await deleteEmpresa(emp.id);
        if (!result.success) { showToast({ type: 'error', title: 'Error', message: result.error }); return; }
        await recargarEmpresas();
        showToast({ type: 'info', title: 'Empresa eliminada', message: emp.nombre });
      }
    });
  };

  const handleAddCuadrilla = async (empresaId) => {
    const codigo = (newCuadrilla[empresaId] || '').trim();
    if (!codigo) return;
    const result = await addCuadrilla(empresaId, codigo);
    if (!result.success) { showToast({ type: 'error', title: 'Error', message: result.error }); return; }
    setNewCuadrilla(prev => ({ ...prev, [empresaId]: '' }));
    await recargarEmpresas();
  };

  const handleDeleteCuadrilla = async (cuadrillaId, codigo) => {
    const result = await deleteCuadrilla(cuadrillaId);
    if (!result.success) { showToast({ type: 'error', title: 'Error', message: result.error }); return; }
    await recargarEmpresas();
    showToast({ type: 'info', title: `Cuadrilla ${codigo} eliminada` });
  };

  useEffect(() => {
    if (activeTab === 'AUDITORIA') fetchAuditLogs();

    // ─── REALTIME SUBSCRIPTION ──────────────────────────────────────────
    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', table: 'win_orders', schema: 'public' }, () => {
        cargarOrdenes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  // ─── Carga de órdenes desde Supabase ───────────────────────────────────
  const cargarOrdenes = async () => {
    const data = await getOrders();
    setOrdenes(data);
    // Extraer cuadrillas únicas para el filtro
    const cuadrillas = new Set();
    data.forEach(o => { if (o.tecnicoCuadrilla) cuadrillas.add(o.tecnicoCuadrilla); });
    setListaCuadrillas(Array.from(cuadrillas));
  };

  const fetchAuditLogs = async () => {
    const logs = await getAuditLogs();
    setAuditLogs(logs);
  };

  // ─── Íconos de estado ──────────────────────────────────────────────────
  const getStatusIcon = (status) => {
    const map = {
      'EN PROCESO': <Clock size={16} color="#ffa500" />,
      'PENDIENTE':    <Send size={16} color="#1E90FF" />,
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
    if (orden?.tecnicoEmail) await crearNotificacion(orden.tecnicoEmail, 'APROBADO', codigoCliente);
    addAuditLog('APROBAR', 'ORDEN', codigoCliente, { gestionadoPor: session.email });
    showToast({ type: 'success', title: 'Orden Aprobada', message: `Orden ${codigoCliente} aprobada exitosamente.` });
  };

  // ─── Abrir modal de rechazo ───────────────────────────────────────────
  const abrirModalRechazo = (orden) => {
    setOrdenParaRechazar(orden);
    setMotivoRechazo('');
    setShowRechazoModal(true);
  };

  // ─── Revertir orden APROBADA → PENDIENTE (solo ADMINISTRADOR) ────────
  const abrirModalRevertir = (orden) => {
    setOrdenParaRevertir(orden);
    setMotivoRevertir('');
    setShowRevertirModal(true);
  };

  const confirmarRevertir = async () => {
    if (!motivoRevertir.trim()) {
      showToast({ type: 'warning', title: 'Campo requerido', message: 'Debes ingresar el motivo de la reversión.' });
      return;
    }
    const codigoCliente = ordenParaRevertir.codigoCliente;

    const result = await updateOrderStatus(codigoCliente, 'PENDIENTE');
    if (!result.success) { showToast({ type: 'error', title: 'Error', message: result.error }); return; }

    setOrdenes(prev => prev.map(o =>
      o.codigoCliente === codigoCliente ? { ...o, status: 'PENDIENTE', motivoRechazo: null } : o
    ));
    if (ordenParaRevertir?.tecnicoEmail) {
      await crearNotificacion(ordenParaRevertir.tecnicoEmail, 'REVERTIDO', codigoCliente, motivoRevertir.trim());
    }
    addAuditLog('REVERTIR_A_PENDIENTE', 'ORDEN', codigoCliente, { motivo: motivoRevertir.trim(), gestionadoPor: session.email });
    showToast({ type: 'info', title: 'Orden revertida', message: `Orden ${codigoCliente} devuelta a Pendiente.` });
    setShowRevertirModal(false);
    setOrdenParaRevertir(null);
    setMotivoRevertir('');
  };

  // ─── Confirmar rechazo con motivo (Supabase) ─────────────────────────
  const confirmarRechazo = async () => {
    if (!motivoRechazo.trim()) { showToast({ type: 'warning', title: 'Campo requerido', message: 'Debes ingresar el motivo del rechazo.' }); return; }
    const codigoCliente = ordenParaRechazar.codigoCliente;

    const result = await updateOrderStatus(codigoCliente, 'RECHAZADO', motivoRechazo.trim());
    if (!result.success) { showToast({ type: 'error', title: 'Error', message: result.error }); return; }

    setOrdenes(prev => prev.map(o =>
      o.codigoCliente === codigoCliente
        ? { ...o, status: 'RECHAZADO', motivoRechazo: motivoRechazo.trim() }
        : o
    ));
    if (ordenParaRechazar?.tecnicoEmail) {
      await crearNotificacion(ordenParaRechazar.tecnicoEmail, 'RECHAZADO', codigoCliente, motivoRechazo.trim());
    }
    addAuditLog('RECHAZAR', 'ORDEN', codigoCliente, { motivo: motivoRechazo.trim(), gestionadoPor: session.email });
    showToast({ type: 'info', title: 'Orden Rechazada', message: `Orden ${codigoCliente} rechazada.` });
    setShowRechazoModal(false);
    setOrdenParaRechazar(null);
    setMotivoRechazo('');
  };

  // ─── Descarga de CSV y PDF ─────────────────────────────────────────────
  const descargarCSV = (orden) => {
    // Si no tiene csvContent, lo generamos dinámicamente a partir de las mediciones
    let content = orden.csvContent;
    if (!content && orden.mediciones) {
      const header = "Ambiente,Piso,Velocidad 2.4G (Mbps),RSSI 2.4G (dBm),Velocidad 5G (Mbps),RSSI 5G (dBm)\n";
      const rows = orden.mediciones.map(m => 
        `${m.ubicacion === 'Otro' ? m.ubicacionPersonalizada : m.ubicacion},${m.piso},${m.velocidad24g},${m.rssi24g},${m.velocidad5g},${m.rssi5g}`
      ).join("\n");
      content = header + rows;
    }

    if (!content) {
      showToast({ type: 'warning', title: 'Sin datos', message: 'Esta orden no tiene mediciones registradas para exportar.' });
      return;
    }

    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const ahora = new Date(orden.fechaGuardado || Date.now());
    const dd = String(ahora.getDate()).padStart(2, '0');
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const aa = String(ahora.getFullYear()).slice(2);
    
    link.download = `${orden.codigoCliente}-${dd}-${mm}-${aa}-mediciones.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({ type: 'success', title: 'CSV Descargado', message: 'El reporte se generó correctamente.' });
  };

  const descargarPDFTopologia = async (idx, codigoCliente) => {
    const element = topologiaRefs.current[idx];
    if (!element) return;
    setIsExportingPDF(true);
    
    setTimeout(async () => {
      try {
        const fullWidth = Math.max(element.scrollWidth, element.offsetWidth);
        const fullHeight = Math.max(element.scrollHeight, element.offsetHeight);
        const canvas = await html2canvas(element, {
          scale: 2,
          backgroundColor: getComputedStyle(document.body).getPropertyValue('background-color') || '#121212',
          useCORS: true,
          width: fullWidth,
          height: fullHeight,
          windowWidth: fullWidth,
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height] 
        });
        
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        
        const ahora = new Date();
        const dd = String(ahora.getDate()).padStart(2, '0');
        const mm = String(ahora.getMonth() + 1).padStart(2, '0');
        const aa = String(ahora.getFullYear()).slice(2);

        pdf.save(`${codigoCliente}-${dd}-${mm}-${aa}-Topologia.pdf`);
        showToast({ type: 'success', title: 'PDF Generado', message: 'La topología se descargó exitosamente.' });
      } catch (error) {
        console.error("Error generando PDF", error);
        showModal({ type: 'error', title: 'Error de exportación', message: 'No se pudo generar el PDF de la topología.' });
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
    setCuadrillasForm([]);
    setNewUser({ email: '', nombre: '', password: '', role: 'TECNICO', cuadrilla: '', supervisor_tipo: '', empresa_id: '', dni: '', telefono: '' });
    showToast({ type: 'success', title: 'Usuario creado', message: `${newUser.email} fue creado exitosamente. Deberá crear su contraseña al primer ingreso.` });
  };

  // ─── Editar tipo de supervisor (SGI/SGA) ───────────────────────────────
  const handleOpenEditTipo = (user) => {
    setEditTipoTarget(user);
    setEditTipoValue(user.supervisor_tipo || 'SGI');
    setShowEditTipo(true);
  };

  const handleConfirmEditTipo = async () => {
    const result = await updateSupervisorTipo(editTipoTarget.email, editTipoValue);
    if (!result.success) { showToast({ type: 'error', title: 'Error', message: result.error }); return; }
    getUsers().then(setUsuarios);
    setShowEditTipo(false);
    setEditTipoTarget(null);
    showToast({ type: 'success', title: 'Tipo actualizado', message: `${editTipoTarget.email} ahora es ${editTipoValue}.` });
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
    const result = await resetUserPassword(resetTarget);
    if (!result.success) { showToast({ type: 'error', title: 'Error', message: result.error }); return; }
    setShowResetModal(false);
    showModal({
      type: 'success',
      title: 'Email Enviado',
      message: result.message || `Se envió un enlace de restablecimiento a ${resetTarget}. El usuario deberá revisar su correo.`
    });
  };

  // ─── Filtrado de órdenes ───────────────────────────────────────────────
  const ordenesFiltradas = ordenes.filter(
    o => (filtroEstado === 'TODOS' || o.status === filtroEstado) &&
         (filtroCuadrilla === 'TODAS' || o.tecnicoCuadrilla === filtroCuadrilla)
  );

  const isAdmin = session?.role === 'ADMINISTRADOR';
  // CONSULTOR: supervisor de SOLO LECTURA. Ve todas las órdenes y descarga sus
  // reportes, pero no aprueba/rechaza (los botones se ocultan y RLS lo bloquea).
  const isConsultor = session?.role === 'SUPERVISOR' && session?.supervisor_tipo === 'CONSULTOR';

  // ─── Título dinámico según rol ─────────────────────────────────────────
  const panelTitle = isAdmin
    ? 'Panel de Administración'
    : isConsultor ? 'Panel de Consulta' : 'Panel de Supervisión';
  const panelSubtitle = isAdmin
    ? 'Control total: órdenes, usuarios y reportes.'
    : isConsultor
      ? 'Vista de consulta: todas las órdenes y descarga de reportes (solo lectura).'
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
            {isAdmin && (
              <div
                className={`stat-card stat-card--blue ${activeTab === 'EMPRESAS' ? 'stat-card--active-blue' : ''}`}
                onClick={() => setActiveTab('EMPRESAS')}
              >
                <Building2 size={22} />
                <span className="stat-label">Empresas</span>
              </div>
            )}
            {isAdmin && (
              <div
                className={`stat-card ${activeTab === 'AUDITORIA' ? 'stat-card--active' : ''}`}
                onClick={() => setActiveTab('AUDITORIA')}
              >
                <History size={22} />
                <span className="stat-label">Auditoría</span>
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
                  <option value="PENDIENTE">Enviados (Pendientes)</option>
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
                        {/* Tipo de orden: Instalación Nueva (SGI) / Post-Venta (SGA) */}
                        <span
                          className="badge"
                          style={ orden.tipoServicio === 'Post-Venta'
                            ? { color: '#1E90FF', borderColor: '#1E90FF', background: 'rgba(30,144,255,0.08)' }
                            : { color: 'var(--win-orange)', borderColor: 'var(--win-orange)', background: 'rgba(255,107,0,0.08)' } }
                        >
                          {orden.tipoServicio === 'Post-Venta'
                            ? <><Tv size={14} /> Post-Venta (SGA)</>
                            : <><RouterIcon size={14} /> Instalación (SGI)</>}
                        </span>
                        <span className="badge"><RouterIcon size={14} /> {orden.equipos?.length || 0} APs</span>
                        <span className="badge"><Globe size={14} /> {orden.mediciones?.length || 0} Mediciones</span>
                        <span className="badge"><Tv size={14} /> {orden.winboxes?.length || 0} Winbox</span>
                        <span className="badge"><Wifi size={14} /> {orden.televisores?.length || 0} WinTV</span>
                      </div>
                      <div className="orden-actions">
                        <Button variant="secondary" onClick={() => descargarCSV(orden)} style={{ fontSize: '0.8rem' }}>
                          CSV
                        </Button>
                        {orden.status === 'PENDIENTE' && !isConsultor && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button onClick={() => aprobarOrden(orden.codigoCliente)} style={{ background: '#00C853', color: '#fff', borderColor: '#00C853', fontSize: '0.8rem' }}>
                              <CheckCircle size={14} /> Aprobar
                            </Button>
                            <Button onClick={() => abrirModalRechazo(orden)} style={{ background: '#FF3D00', color: '#fff', borderColor: '#FF3D00', fontSize: '0.8rem' }}>
                              <XCircle size={14} /> Rechazar
                            </Button>
                          </div>
                        )}
                        {orden.status === 'APROBADO' && session?.role === 'ADMINISTRADOR' && (
                          <Button onClick={() => abrirModalRevertir(orden)} style={{ background: '#F57F17', color: '#fff', borderColor: '#F57F17', fontSize: '0.8rem' }}>
                            <RotateCcw size={14} /> Revertir a Pendiente
                          </Button>
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
                                 winboxes={orden.winboxes || []}
                                 televisores={orden.televisores || []}
                                 isExporting={true}
                                 listaUbicaciones={[]}
                                 onAgregarUbicacion={() => {}}
                               />
                            </div>

                            <div className="detail-table-wrapper">
                              <table className="detail-table">
                                <thead>
                                  <tr>
                                    <th>Equipo</th><th>Marca</th><th>Tipo</th><th>S/N</th><th>Ambiente</th><th>Piso</th><th>Conexión</th><th>3ro</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orden.equipos.map((eq, i) => (
                                    <tr key={i}>
                                      <td>{eq.nombre}</td>
                                      <td>{eq.marca || eq.marcaTercero || '—'}</td>
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
                    {newUser.role === 'TECNICO' && (<>
                      <Select
                        label="Empresa contratista (*)"
                        value={newUser.empresa_id}
                        onChange={async e => {
                          const id = e.target.value;
                          const cuadrillas = id ? await getCuadrillas(id) : [];
                          setCuadrillasForm(cuadrillas);
                          setNewUser({ ...newUser, empresa_id: id, cuadrilla: '' });
                        }}
                        options={[
                          { label: '— Seleccionar empresa —', value: '' },
                          ...empresas.map(em => ({ label: em.nombre, value: em.id }))
                        ]}
                      />
                      <Select
                        label="Cuadrilla (*)"
                        value={newUser.cuadrilla}
                        onChange={e => setNewUser({ ...newUser, cuadrilla: e.target.value })}
                        options={[
                          { label: newUser.empresa_id ? '— Seleccionar cuadrilla —' : '— Selecciona primero la empresa —', value: '' },
                          ...cuadrillasForm.map(c => ({ label: c.codigo, value: c.codigo }))
                        ]}
                        disabled={!newUser.empresa_id}
                      />
                      <Input label="DNI" placeholder="12345678" value={newUser.dni} onChange={e => setNewUser({ ...newUser, dni: e.target.value })} />
                      <Input label="Teléfono" placeholder="987654321" value={newUser.telefono} onChange={e => setNewUser({ ...newUser, telefono: e.target.value })} />
                    </>)}
                    {newUser.role === 'SUPERVISOR' && (
                      <Select label="Tipo de Supervisor (*)" value={newUser.supervisor_tipo} onChange={e => setNewUser({...newUser, supervisor_tipo: e.target.value})} options={[
                        { label: '— Seleccionar —', value: '' },
                        { label: 'SGI (Instalación Nueva)', value: 'SGI' },
                        { label: 'SGA (Post-Venta)', value: 'SGA' },
                        { label: 'Consultor (ve todo, solo lectura)', value: 'CONSULTOR' }
                      ]} />
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
                              {u.role === 'SUPERVISOR' && u.supervisor_tipo ? `SUPERVISOR · ${u.supervisor_tipo}` : u.role}
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
                                {u.role === 'SUPERVISOR' && (
                                  <button className="icon-action-btn" onClick={() => handleOpenEditTipo(u)} title="Cambiar tipo (SGI/SGA)" style={{ color: '#1E90FF' }}>
                                    <Edit2 size={16} />
                                  </button>
                                )}
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

        {/* ═══════════════════════════════════════════════════════════════
            PESTAÑA: AUDITORÍA
            ═══════════════════════════════════════════════════════════════ */}
        {/* ═══════════════════════════════════════════════════════════════
            PESTAÑA: EMPRESAS Y CUADRILLAS (solo ADMINISTRADOR)
            ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'EMPRESAS' && isAdmin && (
          <div className="animate-fade-in">
            <Card>
              <h3 className="users-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} color="var(--win-blue)" /> Gestión de Empresas y Cuadrillas
              </h3>

              {/* Formulario nueva empresa */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginTop: '1.25rem' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="Nueva empresa contratista"
                    placeholder="Ej: DIGETEL"
                    value={newEmpresaNombre}
                    onChange={e => { setNewEmpresaNombre(e.target.value); setEmpresaError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleAddEmpresa()}
                  />
                </div>
                <Button onClick={handleAddEmpresa} style={{ marginBottom: empresaError ? '1.4rem' : '0' }}>
                  <Plus size={16} /> Agregar empresa
                </Button>
              </div>
              {empresaError && (
                <div className="login-error-msg" style={{ marginTop: '0.5rem' }}>
                  <AlertCircle size={16} /> <span>{empresaError}</span>
                </div>
              )}

              {/* Lista de empresas */}
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {empresasDetalle.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                    No hay empresas registradas aún.
                  </p>
                )}
                {empresasDetalle.map(emp => (
                  <div key={emp.id} style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem'
                  }}>
                    {/* Cabecera empresa */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={16} color="var(--win-orange)" /> {emp.nombre}
                      </span>
                      <button
                        className="icon-action-btn icon-action-btn--danger"
                        onClick={() => handleDeleteEmpresa(emp)}
                        title="Eliminar empresa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Cuadrillas como chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {(emp.win_cuadrillas || []).length === 0 && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Sin cuadrillas aún</span>
                      )}
                      {(emp.win_cuadrillas || []).map(c => (
                        <span key={c.id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          background: 'rgba(30,144,255,0.12)', border: '1px solid rgba(30,144,255,0.35)',
                          borderRadius: '20px', padding: '0.25rem 0.65rem',
                          fontSize: '0.82rem', fontWeight: '600', color: 'var(--win-blue)'
                        }}>
                          {c.codigo}
                          <button
                            onClick={() => handleDeleteCuadrilla(c.id, c.codigo)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(30,144,255,0.6)', display: 'flex', alignItems: 'center', padding: '0' }}
                            title={`Eliminar cuadrilla ${c.codigo}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Agregar cuadrilla */}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        className="ui-input"
                        placeholder="Nueva cuadrilla (ej: D5)"
                        value={newCuadrilla[emp.id] || ''}
                        onChange={e => setNewCuadrilla(prev => ({ ...prev, [emp.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddCuadrilla(emp.id)}
                        style={{ flex: 1, maxWidth: '200px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      />
                      <Button
                        onClick={() => handleAddCuadrilla(emp.id)}
                        variant="secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                      >
                        <Plus size={14} /> Cuadrilla
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'AUDITORIA' && isAdmin && (
          <div className="tab-pane animate-fade-in">
            <Card>
              <div className="admin-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="admin-section-title"><History size={20} color="var(--win-blue)" /> Historial de Auditoría</h2>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                  <input 
                    type="date" 
                    className="ui-input"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '6px' }}
                    value={filtroFechaAuditoria} 
                    onChange={e => setFiltroFechaAuditoria(e.target.value)} 
                  />
                  <Button onClick={fetchAuditLogs} variant="secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                    Actualizar
                  </Button>
                </div>
              </div>
              <div className="detail-table-wrapper" style={{ marginTop: '1.5rem' }}>
                <table className="detail-table users-table">
                  <thead>
                    <tr>
                      <th>Fecha</th><th>Acción</th><th>Recurso Afectado</th><th>Detalle Técnico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const logsFiltrados = auditLogs.filter(log => {
                        if (!filtroFechaAuditoria) return true;
                        return log.created_at.startsWith(filtroFechaAuditoria);
                      });

                      if (logsFiltrados.length === 0) {
                        return <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No hay registros de auditoría para mostrar.</td></tr>;
                      }

                      return logsFiltrados.map((log) => (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                          <td>
                            <span className="header-rol-badge" style={{ color: 'var(--win-blue)', borderColor: 'var(--win-blue)' }}>
                              {log.accion}
                            </span>
                          </td>
                          <td>{log.entidad_afectada} <strong style={{ color: 'var(--text-primary)' }}>{log.entidad_id}</strong></td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.descripcion || '—'}
                          </td>
                        </tr>
                      ));
                    })()}
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
    {/* ─── MODAL REVERTIR A PENDIENTE ────────────────────────────────── */}
    {showRevertirModal && ordenParaRevertir && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <Card style={{ width: '100%', maxWidth: '480px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#F57F17', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw size={20} /> Revertir a Pendiente
            </h3>
            <button onClick={() => setShowRevertirModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            La orden <strong style={{ color: 'var(--text-primary)' }}>{ordenParaRevertir.codigoCliente}</strong> de <strong style={{ color: 'var(--win-orange)' }}>{ordenParaRevertir.tecnicoEmail}</strong> volverá a estado <strong>PENDIENTE</strong> para revisión.
          </p>
          <div>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Motivo de la reversión (*)</label>
            <textarea
              value={motivoRevertir}
              onChange={e => setMotivoRevertir(e.target.value)}
              placeholder="Ej: Se detectó un error en los datos de topología. Por favor corrige y vuelve a enviar."
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowRevertirModal(false)}>
              Cancelar
            </Button>
            <Button style={{ flex: 1, background: '#F57F17', color: '#fff', borderColor: '#F57F17' }} onClick={confirmarRevertir}>
              <RotateCcw size={16} /> Confirmar Reversión
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
            Se enviará un <strong style={{ color: 'var(--text-primary)' }}>enlace de restablecimiento</strong> al correo de <strong style={{ color: '#1E90FF' }}>{resetTarget}</strong>. El usuario recibirá un email para crear su nueva contraseña de forma segura.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowResetModal(false)}>Cancelar</Button>
            <Button style={{ flex: 1, background: '#1E90FF', borderColor: '#1E90FF' }} onClick={handleResetPassword}>
              <Key size={16} /> Enviar Email de Reset
            </Button>
          </div>
        </Card>
      </div>
    )}

    {/* Modal: Editar tipo de supervisor (SGI/SGA) */}
    {showEditTipo && editTipoTarget && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <Card style={{ width: '100%', maxWidth: '420px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#1E90FF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit2 size={20} /> Tipo de Supervisor
            </h3>
            <button onClick={() => setShowEditTipo(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.4rem' }}>×</button>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Define qué órdenes podrá ver <strong style={{ color: '#1E90FF' }}>{editTipoTarget.email}</strong>.
          </p>
          <Select label="Clasificación" value={editTipoValue} onChange={e => setEditTipoValue(e.target.value)} options={[
            { label: 'SGI (Instalación Nueva)', value: 'SGI' },
            { label: 'SGA (Post-Venta)', value: 'SGA' },
            { label: 'Consultor (ve todo, solo lectura)', value: 'CONSULTOR' }
          ]} />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setShowEditTipo(false)}>Cancelar</Button>
            <Button style={{ flex: 1, background: '#1E90FF', borderColor: '#1E90FF' }} onClick={handleConfirmEditTipo}>
              Guardar Cambio
            </Button>
          </div>
        </Card>
      </div>
    )}
    </>
  );
};

export default PanelAdmin;
