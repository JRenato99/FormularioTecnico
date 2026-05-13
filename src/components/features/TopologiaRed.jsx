import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, Router, Wifi, Hash, Edit2, ShieldAlert, Network, AlertTriangle } from 'lucide-react';
import { useUI } from '../ui/Modal.jsx';
import { LEYENDA, getRssiStyle } from '../../utils/constants';
import './Topologia.css';

/**
 * Módulo Arquitectónico: Topología de Red
 */
const TopologiaRed = ({ equipos, setEquipos, isExporting, listaUbicaciones, onAgregarUbicacion }) => {

  const { showToast } = useUI();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddOnt, setShowAddOnt] = useState(false);
  const [editingNode, setEditingNode] = useState(null);

  // Bandera para diferenciar AP tipo WIN de tipo Tercero (3th)
  const [isAdding3thParty, setIsAdding3thParty] = useState(false);

  /** Lista de marcas para AP de Terceros (mismo catálogo compartido) */
  const MARCAS_AP = ['Cisco', 'TP-Link', 'D-Link', 'Huawei', 'Ubiquiti', 'Tenda', 'Mercusys', 'Mikrotik', 'Otro'];

  // Estructura Vacía de un AP para resetear después de añadir
  const initialApState = {
    serialNumber: '',
    marca: 'Huawei',
    parentId: 'ONT',
    conexion: 'Cableado',
    banda: '5G',
    rssiBackhaul: '',
    piso: '',
    ambiente: 'Sala',
    ambientePersonalizado: ''
  };

  const [newAp, setNewAp] = useState(initialApState);

  // Estado para la marca del AP de tercero
  const [marcaTercero, setMarcaTercero] = useState('');
  const [marcaTerceroCustom, setMarcaTerceroCustom] = useState('');

  const [newOnt, setNewOnt] = useState({
    serialNumber: '',
    marca: 'Huawei',
    piso: '1',
    ambiente: 'Sala',
    ambientePersonalizado: ''
  });

  const ontNode = equipos.find(e => e.tipo === 'ONT');
  const apCount = equipos.filter(e => e.tipo === 'AP').length;

  const handlePisoChange = (val, mode) => {
    let pStr = val.replace(/\D/g, '');
    let p = pStr ? parseInt(pStr, 10) : '';
    if (p !== '') {
      if (p < 1) p = 1;
      if (p > 5) p = 5;
      p = p.toString();
    }

    if (mode === 'ont') setNewOnt({ ...newOnt, piso: p });
    else if (mode === 'ap') setNewAp({ ...newAp, piso: p });
    else if (mode === 'edit') setEditingNode({ ...editingNode, piso: p });
  };

  const handleRssiChange = (val, isEdit = false) => {
    let vStr = val.replace(/-/g, '');
    let finalVal = '';
    if (vStr && !isNaN(parseInt(vStr, 10))) {
      finalVal = `-${Math.abs(parseInt(vStr, 10))}`;
    }
    if (isEdit) setEditingNode({ ...editingNode, rssiBackhaul: finalVal });
    else setNewAp({ ...newAp, rssiBackhaul: finalVal });
  };

  /**
   * handleSNChange
   * Enforce brand-specific S/N rules in real-time
   */
  const handleSNChange = (val, mode) => {
    // Solo permitir alfanuméricos
    let clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    let target;
    if (mode === 'ont') target = newOnt;
    else if (mode === 'ap') target = newAp;
    else if (mode === 'edit') target = editingNode;

    const marca = target.marca || 'ZTE';
    const limit = marca === 'ZTE' ? 15 : 16;

    // Bloquear longitud
    if (clean.length > limit) clean = clean.substring(0, limit);

    if (mode === 'ont') setNewOnt({ ...newOnt, serialNumber: clean });
    else if (mode === 'ap') setNewAp({ ...newAp, serialNumber: clean });
    else if (mode === 'edit') setEditingNode({ ...editingNode, serialNumber: clean });
  };

  const handleAddOnt = () => {
    if (!newOnt.serialNumber) return showToast({ type: 'error', title: 'Falta S/N', message: 'Por favor ingresa el Número de Serie (S/N) de la ONT.' });
    if (!newOnt.piso) return showToast({ type: 'error', title: 'Falta Piso', message: 'Por favor ingresa el Piso de la ONT.' });
    if (newOnt.ambiente === 'Otro' && !newOnt.ambientePersonalizado) return showToast({ type: 'error', title: 'Falta Ambiente', message: 'Por favor ingresa el nombre manual del ambiente.' });

    const ambienteF = newOnt.ambiente === 'Otro' ? newOnt.ambientePersonalizado : newOnt.ambiente;
    if (newOnt.ambiente === 'Otro') onAgregarUbicacion(newOnt.ambientePersonalizado);

    // Validación Final Estricta
    if (newOnt.marca === 'ZTE') {
      if (newOnt.serialNumber.length !== 15) return showToast({ type: 'error', title: 'S/N Inválido', message: 'El S/N de ZTE debe tener exactamente 15 caracteres.' });
      if (!newOnt.serialNumber.startsWith('ZTE')) return showToast({ type: 'error', title: 'S/N Inválido', message: 'El S/N de ZTE debe comenzar con los caracteres "ZTE".' });
    } else {
      if (newOnt.serialNumber.length !== 16) return showToast({ type: 'error', title: 'S/N Inválido', message: 'El S/N de Huawei debe tener exactamente 16 caracteres.' });
    }

    setEquipos([{
      id: 'ONT',
      serialNumber: newOnt.serialNumber,
      marca: newOnt.marca,
      nombre: 'ONT',
      tipo: 'ONT',
      piso: newOnt.piso,
      ambienteFinal: ambienteF,
      ambiente: newOnt.ambiente,
      ambientePersonalizado: newOnt.ambientePersonalizado,
      esTercero: false
    }]);
    setShowAddOnt(false);
  };

  const openAddApPanel = (is3th) => {
    setIsAdding3thParty(is3th);
    // Heredar marca de la ONT si es equipo WIN
    const marcaSincronizada = !is3th && ontNode ? ontNode.marca : initialApState.marca;
    setNewAp({ ...initialApState, marca: marcaSincronizada });
    setMarcaTercero('');
    setMarcaTerceroCustom('');
    setEditingNode(null);
    setShowAddModal(true);
  };

  /**
   * Calcula el nivel de cascada de un equipo dado su ID.
   * ONT = nivel 0, AP hijo directo = nivel 1, AP nieto = nivel 2 (máximo permitido).
   * @param {string} equipoId - ID del equipo del que se quiere saber el nivel.
   * @returns {number}
   */
  const getCascadeLevel = (equipoId) => {
    if (equipoId === 'ONT') return 0;
    const equipo = equipos.find(e => e.id === equipoId);
    if (!equipo) return 0;
    return 1 + getCascadeLevel(equipo.parentId);
  };

  const handleAddAp = () => {
    if (apCount >= 8) return;

    // Validación: no permitir cascada más allá del nivel 2 (ONT → AP → AP max)
    const nivelPadre = getCascadeLevel(newAp.parentId);
    if (nivelPadre >= 2) {
      return showToast({ type: 'error', title: 'Límite de Cascada', message: 'No se permite una conexión en cascada a 3er nivel. Máximo: ONT → AP → AP.' });
    }

    // Alerta de mala práctica: AP padre con conexión inalámbrica
    const padreEquipo = equipos.find(e => e.id === newAp.parentId);
    if (padreEquipo && padreEquipo.tipo === 'AP' && padreEquipo.conexion === 'Inalámbrico') {
      const confirmar = window.confirm(
        '⚠️ No Recomendable\n\nEstás conectando un AP a otro que ya usa enlace INALÁMBRICO (MESH).\nEsto puede degradar significativamente la calidad y velocidad de la red.\n\n¿Deseas continuar de todas formas?'
      );
      if (!confirmar) return;
    }

    if (!isAdding3thParty && !newAp.serialNumber) return showToast({ type: 'error', title: 'Falta S/N', message: 'Debes ingresar el S/N del AP WIN.' });
    if (!newAp.piso) return showToast({ type: 'error', title: 'Falta Piso', message: 'Debes rellenar el Piso del Access Point.' });
    if (newAp.ambiente === 'Otro' && !newAp.ambientePersonalizado) return showToast({ type: 'error', title: 'Falta Ambiente', message: 'Por favor escribe el nombre del ambiente.' });

    // Validar S/N único entre todos los equipos registrados
    if (!isAdding3thParty) {
      // Validación Final Estricta para AP WIN
      if (newAp.marca === 'ZTE') {
        if (newAp.serialNumber.length !== 15) return showToast({ type: 'error', title: 'S/N Inválido', message: 'El S/N de ZTE debe tener exactamente 15 caracteres.' });
        if (!newAp.serialNumber.startsWith('ZTE')) return showToast({ type: 'error', title: 'S/N Inválido', message: 'El S/N de ZTE debe comenzar con los caracteres "ZTE".' });
      } else {
        if (newAp.serialNumber.length !== 16) return showToast({ type: 'error', title: 'S/N Inválido', message: 'El S/N de Huawei debe tener exactamente 16 caracteres.' });
      }

      const snDuplicado = equipos.find(e => e.serialNumber && e.serialNumber.toUpperCase() === newAp.serialNumber.toUpperCase());
      if (snDuplicado) return showToast({ type: 'error', title: 'S/N Duplicado', message: `El S/N "${newAp.serialNumber}" ya está registrado en (${snDuplicado.nombre}).` });
    }

    const isWireless = newAp.conexion === 'Inalámbrico';

    if (isWireless && !isAdding3thParty && !newAp.rssiBackhaul) {
      return showToast({ type: 'warning', title: 'Falta RSSI', message: 'Si configuras enlace MESH, requieres escribir la señal RSSI del Backhaul.' });
    }

    const ambienteF = newAp.ambiente === 'Otro' ? newAp.ambientePersonalizado : newAp.ambiente;
    if (newAp.ambiente === 'Otro') onAgregarUbicacion(newAp.ambientePersonalizado);

    const newId = `AP${Date.now()}`;
    const marcaFinal = isAdding3thParty
      ? (marcaTercero === 'Otro' ? marcaTerceroCustom : marcaTercero)
      : '';
    const nameStr = isAdding3thParty
      ? `AP 3th${marcaFinal ? ` (${marcaFinal})` : ''}`
      : 'AP WIN';

    setEquipos([...equipos, {
      id: newId,
      nombre: nameStr,
      tipo: 'AP',
      ...newAp,
      serialNumber: isAdding3thParty ? '' : newAp.serialNumber,
      marca: isAdding3thParty ? '' : newAp.marca,
      ambienteFinal: ambienteF,
      banda: isWireless ? newAp.banda : null,
      rssiBackhaul: (isWireless && !isAdding3thParty) ? newAp.rssiBackhaul : null,
      esTercero: isAdding3thParty,
      marcaTercero: isAdding3thParty ? marcaFinal : ''
    }]);

    if (isAdding3thParty) {
      showToast({ type: 'info', title: 'AP de Terceros', message: 'Equipo registrado como referencial (sin gestión WIN).' });
    }

    setShowAddModal(false);
  };

  const startEditing = (nodo) => {
    setShowAddModal(false);
    setShowAddOnt(false);
    setEditingNode({
      ...nodo,
      ambientePersonalizado: nodo.ambiente === 'Otro' ? (nodo.ambientePersonalizado || nodo.ambienteFinal) : ''
    });
  };

  const handleUpdateNode = () => {
    if (!editingNode.esTercero && !editingNode.serialNumber) return showToast({ type: 'error', title: 'Falta S/N', message: 'Debes ingresar el S/N.' });
    if (!editingNode.piso) return showToast({ type: 'error', title: 'Falta Piso', message: 'Debes rellenar el Piso.' });
    if (editingNode.ambiente === 'Otro' && !editingNode.ambientePersonalizado) return showToast({ type: 'error', title: 'Falta Ambiente', message: 'Escribe el nombre del ambiente especial.' });

    // Validar que el S/N no esté ya en uso por OTRO equipo
    if (!editingNode.esTercero && editingNode.serialNumber) {
      const snDuplicado = equipos.find(
        e => e.id !== editingNode.id &&
          e.serialNumber &&
          e.serialNumber.toUpperCase() === editingNode.serialNumber.toUpperCase()
      );
      if (snDuplicado) return showToast({ type: 'error', title: 'S/N Duplicado', message: `El S/N "${editingNode.serialNumber}" ya está en uso por "${snDuplicado.nombre}".` });
    }

    const isWireless = editingNode.conexion === 'Inalámbrico';
    if (editingNode.tipo === 'AP' && isWireless && !editingNode.esTercero && !editingNode.rssiBackhaul) {
      return showToast({ type: 'warning', title: 'Falta RSSI', message: "Requieres escribir la señal RSSI del Backhaul." });
    }

    const ambienteF = editingNode.ambiente === 'Otro' ? editingNode.ambientePersonalizado : editingNode.ambiente;
    if (editingNode.ambiente === 'Otro') onAgregarUbicacion(editingNode.ambientePersonalizado);

    const checkCircular = editingNode.id === editingNode.parentId;
    if (checkCircular) return showToast({ type: 'error', title: 'Error de Red', message: "Un equipo no puede conectarse a si mismo." });

    setEquipos(prev => {
      let updated = prev.map(e => {
        if (e.id === editingNode.id) {
          return {
            ...e,
            ...editingNode,
            ambienteFinal: ambienteF,
            banda: (editingNode.tipo === 'AP' && isWireless) ? editingNode.banda : null,
            rssiBackhaul: (editingNode.tipo === 'AP' && isWireless && !editingNode.esTercero) ? editingNode.rssiBackhaul : null
          };
        }
        return e;
      });

      // Si se editó la ONT, sincronizar marca en todos los APs WIN
      if (editingNode.id === 'ONT') {
        updated = updated.map(e => {
          if (e.tipo === 'AP' && !e.esTercero) {
            return { ...e, marca: editingNode.marca };
          }
          return e;
        });
      }
      return updated;
    });

    setEditingNode(null);
  };

  const handleRemoveAp = (id) => {
    const getChildrenIds = (parentId) => {
      const children = equipos.filter(e => e.parentId === parentId);
      return children.reduce((acc, child) => [...acc, child.id, ...getChildrenIds(child.id)], []);
    };

    const idsToRemove = [id, ...getChildrenIds(id)];
    setEquipos(equipos.filter(e => !idsToRemove.includes(e.id)));
  };

  const renderArbol = (parentId) => {
    const hijos = equipos.filter(e => e.parentId === parentId);
    if (hijos.length === 0) return null;

    return (
      <div className="tree-children">
        {hijos.map(hijo => {
          const is3th = hijo.esTercero;
          const styleInfo = (hijo.conexion === 'Inalámbrico' && !is3th) ? getRssiStyle(hijo.rssiBackhaul) : null;

          let nodeBorderColor = 'var(--border-color)';
          let nodeBgColor = 'var(--input-bg)';
          let iconBgColor = '#444';

          if (is3th) {
            nodeBorderColor = '#555';
            nodeBgColor = '#222';
            iconBgColor = '#555';
          } else if (styleInfo) {
            nodeBorderColor = styleInfo.color;
            nodeBgColor = styleInfo.bg;
            iconBgColor = styleInfo.color;
          }

          let lineClass = 'line-fo';
          if (hijo.conexion === 'Inalámbrico') {
            lineClass = hijo.banda === '5G' ? 'line-5g' : 'line-24g';
          }

          // Badge inalámbrico: texto completo
          const wirelessLabel = hijo.banda === '5G' ? '5G Inalámbrico' : '2.4G Inalámbrico';

          return (
            <div key={hijo.id} className="tree-node-container animate-fade-in">
              <div className="node-wrapper">
                <div className={`tree-line ${lineClass}`}>
                  {hijo.conexion === 'Inalámbrico' && (
                    <span className={`wireless-badge ${hijo.banda === '5G' ? 'wb-5g' : 'wb-24g'}`}>
                      {wirelessLabel}
                    </span>
                  )}
                </div>

                <div className="node-card" style={{ borderColor: nodeBorderColor, background: nodeBgColor }}>
                  <div className="node-icon ap-icon" style={{ background: iconBgColor }}>
                    {is3th
                      ? <ShieldAlert size={20} />
                      : hijo.conexion === 'Cableado'
                        ? <Network size={20} />   /* Ícono de cable para AP cableados */
                        : <Wifi size={20} />       /* Ícono wifi para AP inalámbricos */
                    }
                  </div>
                  <div className="node-info">
                    <strong>{hijo.nombre}</strong>
                    {hijo.marcaTercero && (
                      <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '2px' }}>
                        Marca: {hijo.marcaTercero}
                      </div>
                    )}
                    {!is3th && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--win-orange)', fontWeight: 'bold' }}>
                          Marca: {hijo.marca}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <Hash size={12} /> S/N: {hijo.serialNumber}
                        </div>
                      </div>
                    )}
                    <span className="node-meta">
                      {hijo.conexion === 'Inalámbrico'
                        ? (hijo.banda === '5G' ? '5G Inalámbrico' : '2.4G Inalámbrico')
                        : 'Cableado'}
                    </span>
                    <div className="node-location-badge">
                      P{hijo.piso} - {hijo.ambienteFinal}
                    </div>
                    {hijo.conexion === 'Inalámbrico' && hijo.rssiBackhaul && !is3th && (
                      <span style={{ fontSize: '0.85rem', color: styleInfo?.color, fontWeight: '600' }}>
                        RSSI Backhaul: {hijo.rssiBackhaul} dBm
                      </span>
                    )}
                  </div>

                  {/* Botonera de Control de Nodo */}
                  <div className={`node-actions ${isExporting ? 'exporting-hide' : ''}`}>
                    <button className="node-action-btn btn-edit" onClick={() => startEditing(hijo)} title="Editar equipo">
                      <Edit2 size={16} />
                    </button>
                    <button className="node-action-btn btn-delete" onClick={() => handleRemoveAp(hijo.id)} title="Eliminar equipo">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {renderArbol(hijo.id)}
            </div>
          );
        })}
      </div>
    );
  };
  const RssiBadge = ({ rssiValue }) => {
    const styleInfo = getRssiStyle(rssiValue);
    if (!styleInfo) return null;
    return (
      <div className="rssi-evaluation-badge" style={{ borderColor: styleInfo.color, color: styleInfo.color, background: styleInfo.bg, marginTop: '0.5rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid', fontSize: '0.8rem', fontWeight: 600 }}>
        Evaluación: {styleInfo.lbl}
      </div>
    );
  };

  return (
    <Card className="topologia-card">
      <div className="topologia-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2>Topología de Red</h2>
          <p className="subtitle">Configura y visualiza la distribución de equipos WIN y Terceros</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
          <Button
            onClick={() => openAddApPanel(false)}
            disabled={!ontNode || apCount >= 8}
            className={`${isExporting ? 'exporting-hide' : ''}`}
          >
            <Plus size={18} /> Añadir AP WIN
          </Button>
          <Button
            variant="secondary"
            onClick={() => openAddApPanel(true)}
            disabled={!ontNode || apCount >= 8}
            className={`${isExporting ? 'exporting-hide' : ''}`}
            style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
          >
            <Plus size={14} /> Añadir AP 3th
          </Button>
        </div>
      </div>

      {/* COMPONENTE DE EDICIÓN FLOTANTE */}
      {editingNode && !isExporting && (
        <div className="add-ap-form glass-panel animate-fade-in" style={{ borderColor: 'var(--text-secondary)' }}>
          <h4 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit2 size={18} /> Editar Registro: {editingNode.nombre}
          </h4>
          <div className="form-grid">

            {!editingNode.esTercero && (
              <>
                <Select
                  label="Marca del Equipo (*)"
                  value={editingNode.marca}
                  disabled={editingNode.tipo === 'AP'} // Bloqueado para APs WIN
                  onChange={e => setEditingNode({ ...editingNode, marca: e.target.value, serialNumber: '' })}
                  options={[
                    { label: 'ZTE', value: 'ZTE' },
                    { label: 'Huawei', value: 'Huawei' }
                  ]}
                />
                <Input
                  label="Número de Serie (S/N) (*)"
                  placeholder={editingNode.marca === 'ZTE' ? "Ej: ZTEB01234567890" : "Ej: HUAW012345678901"}
                  value={editingNode.serialNumber}
                  onChange={e => handleSNChange(e.target.value, 'edit')}
                />
              </>
            )}

            <Input
              label="Piso (*)"
              type="number"
              placeholder="Ej: 2"
              value={editingNode.piso}
              onChange={e => handlePisoChange(e.target.value, 'edit')}
            />
            <Select
              label="Ambiente (*)"
              value={editingNode.ambiente || 'Sala'}
              onChange={e => setEditingNode({ ...editingNode, ambiente: e.target.value })}
              options={listaUbicaciones.map(u => ({ label: u, value: u }))}
            />
            {editingNode.ambiente === 'Otro' && (
              <Input
                label="Nombre del Ambiente"
                placeholder="Ej: Sótano"
                value={editingNode.ambientePersonalizado}
                onChange={e => setEditingNode({ ...editingNode, ambientePersonalizado: e.target.value })}
              />
            )}

            {editingNode.tipo === 'AP' && (
              <>
                <Select
                  label="Conectar desde"
                  value={editingNode.parentId}
                  onChange={e => setEditingNode({ ...editingNode, parentId: e.target.value })}
                  options={equipos.filter(e => e.id !== editingNode.id).map(e => ({ label: `${e.nombre} (P${e.piso} - ${e.ambienteFinal})`, value: e.id }))}
                />
                <Select
                  label="Tipo de Conexión"
                  value={editingNode.conexion}
                  onChange={e => setEditingNode({ ...editingNode, conexion: e.target.value })}
                  options={[
                    { label: 'Cableado (UTP)', value: 'Cableado' },
                    { label: 'Inalámbrico', value: 'Inalámbrico' }
                  ]}
                />

                {editingNode.conexion === 'Inalámbrico' && (
                  <>
                    <Select
                      label="Frecuencia Backhaul"
                      value={editingNode.banda}
                      onChange={e => setEditingNode({ ...editingNode, banda: e.target.value })}
                      options={[
                        { label: '5 GHz', value: '5G' },
                        { label: '2.4 GHz', value: '2.4G' }
                      ]}
                    />

                    {!editingNode.esTercero && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Input
                          label="RSSI (dBm) (*)"
                          type="number"
                          placeholder="Ej: -55"
                          value={editingNode.rssiBackhaul}
                          onChange={e => handleRssiChange(e.target.value, true)}
                        />
                        {editingNode.rssiBackhaul && <RssiBadge rssiValue={editingNode.rssiBackhaul} />}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} onClick={() => setEditingNode(null)}>
              Cancelar
            </Button>
            <Button style={{ flex: 1, background: 'var(--text-secondary)', color: 'white', borderColor: 'var(--text-secondary)' }} onClick={handleUpdateNode}>
              Actualizar Equipo
            </Button>
          </div>
        </div>
      )}

      {/* FORMULARIOS DE CREACIÓN ONT */}
      {!ontNode && !isExporting && !editingNode && (
        <div className="add-ap-form glass-panel animate-fade-in" style={{ borderColor: 'var(--win-orange)' }}>
          <h4 style={{ color: 'var(--win-orange)' }}>Paso 1: Configurar ONT Base</h4>
          <div className="form-grid">
            <Select
              label="Marca del Equipo (*)"
              value={newOnt.marca}
              onChange={e => setNewOnt({ ...newOnt, marca: e.target.value, serialNumber: '' })}
              options={[
                { label: 'ZTE', value: 'ZTE' },
                { label: 'Huawei', value: 'Huawei' }
              ]}
            />
            <Input
              label="Número de Serie (S/N) (*)"
              placeholder={newOnt.marca === 'ZTE' ? "Ej: ZTEB01234567890" : "Ej: HUAW012345678901"}
              value={newOnt.serialNumber}
              onChange={e => handleSNChange(e.target.value, 'ont')}
            />
            <Input
              label="Piso (*)"
              type="number"
              placeholder="Ej: 1"
              value={newOnt.piso}
              onChange={e => handlePisoChange(e.target.value, 'ont')}
            />
            <Select
              label="Ambiente (*)"
              value={newOnt.ambiente}
              onChange={e => setNewOnt({ ...newOnt, ambiente: e.target.value })}
              options={listaUbicaciones.map(u => ({ label: u, value: u }))}
            />
            {newOnt.ambiente === 'Otro' && (
              <Input
                label="Nombre del Ambiente"
                placeholder="Ej: Azotea"
                value={newOnt.ambientePersonalizado}
                onChange={e => setNewOnt({ ...newOnt, ambientePersonalizado: e.target.value })}
              />
            )}
          </div>
          <Button style={{ marginTop: '1rem', width: '100%', background: 'var(--win-orange)', color: 'white' }} onClick={handleAddOnt}>
            Guardar ONT
          </Button>
        </div>
      )}

      {/* FORMULARIO DE CREACIÓN APs */}
      {showAddModal && ontNode && !isExporting && !editingNode && (
        <div className="add-ap-form glass-panel animate-fade-in" style={{ borderColor: isAdding3thParty ? '#888' : 'var(--border-color)' }}>
          <h4>
            {isAdding3thParty
              ? '⚠️ Configurar AP de Terceros (Sin Gestión WIN — Solo Referencial)'
              : 'Configurar Nuevo Access Point WIN'}
          </h4>
          {isAdding3thParty && (
            <div style={{ background: 'rgba(136,136,136,0.1)', border: '1px solid #666', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '0.85rem', color: '#aaa' }}>
              <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px', color: '#ffa500' }} />
              Este equipo se registrará como <strong>sin gestión WIN</strong> y es solo referencial. No contará para estadísticas de cobertura.
            </div>
          )}
          <div className="form-grid">

            {/* Solo pedir SN si no es tercero */}
            {!isAdding3thParty && (
              <>
                <Select
                  label="Marca del Equipo"
                  value={newAp.marca}
                  disabled={true} // Siempre bloqueado para AP WIN nuevo
                  onChange={e => setNewAp({ ...newAp, marca: e.target.value, serialNumber: '' })}
                  options={[
                    { label: 'ZTE', value: 'ZTE' },
                    { label: 'Huawei', value: 'Huawei' }
                  ]}
                />
                <Input
                  label="Número de Serie (S/N) (*)"
                  placeholder={newAp.marca === 'ZTE' ? "Ej: ZTEB01234567890" : "Ej: HUAW012345678901"}
                  value={newAp.serialNumber}
                  onChange={e => handleSNChange(e.target.value, 'ap')}
                />
              </>
            )}

            {/* Campo de marca solo para AP de terceros */}
            {isAdding3thParty && (
              <>
                <Select
                  label="Marca del Equipo (*)"
                  value={marcaTercero}
                  onChange={e => setMarcaTercero(e.target.value)}
                  options={[
                    { label: 'Seleccione una marca...', value: '' },
                    ...MARCAS_AP.map(m => ({ label: m, value: m }))
                  ]}
                />
                {marcaTercero === 'Otro' && (
                  <Input
                    label="Especificar Marca"
                    placeholder="Ej: Ruijie"
                    value={marcaTerceroCustom}
                    onChange={e => setMarcaTerceroCustom(e.target.value)}
                  />
                )}
              </>
            )}

            <Input
              label="Piso (*)"
              type="number"
              placeholder="Ej: 1"
              value={newAp.piso}
              onChange={e => handlePisoChange(e.target.value, 'ap')}
            />
            <Select
              label="Ambiente (*)"
              value={newAp.ambiente}
              onChange={e => setNewAp({ ...newAp, ambiente: e.target.value })}
              options={listaUbicaciones.map(u => ({ label: u, value: u }))}
            />
            {newAp.ambiente === 'Otro' && (
              <Input
                label="Nombre del Ambiente"
                placeholder="Ej: Pasillo"
                value={newAp.ambientePersonalizado}
                onChange={e => setNewAp({ ...newAp, ambientePersonalizado: e.target.value })}
              />
            )}

            <Select
              label="Conectar desde"
              value={newAp.parentId}
              onChange={e => setNewAp({ ...newAp, parentId: e.target.value })}
              options={equipos.map(e => ({ label: `${e.nombre} (P${e.piso} - ${e.ambienteFinal})`, value: e.id }))}
            />
            <Select
              label="Tipo de Conexión"
              value={newAp.conexion}
              onChange={e => setNewAp({ ...newAp, conexion: e.target.value })}
              options={[
                { label: 'Cableado (UTP)', value: 'Cableado' },
                { label: 'Inalámbrico', value: 'Inalámbrico' }
              ]}
            />

            {newAp.conexion === 'Inalámbrico' && (
              <>
                <Select
                  label="Frecuencia Backhaul"
                  value={newAp.banda}
                  onChange={e => setNewAp({ ...newAp, banda: e.target.value })}
                  options={[
                    { label: '5 GHz', value: '5G' },
                    { label: '2.4 GHz', value: '2.4G' }
                  ]}
                />

                {/* RSSI solo si no es tercero */}
                {!isAdding3thParty && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Input
                      label="RSSI Backhaul (dBm) (*)"
                      type="number"
                      placeholder="Ej: -55"
                      value={newAp.rssiBackhaul}
                      onChange={e => handleRssiChange(e.target.value, false)}
                    />
                    {newAp.rssiBackhaul && <RssiBadge rssiValue={newAp.rssiBackhaul} />}
                  </div>
                )}
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button style={{ flex: 1, background: isAdding3thParty ? '#555' : 'var(--win-blue-light)', color: 'white', borderColor: isAdding3thParty ? '#555' : 'var(--win-blue-light)' }} onClick={handleAddAp}>
              Guardar Equipo
            </Button>
          </div>
        </div>
      )}

      {/* LEYENDA */}
      {ontNode && (
        <div className="leyenda-container">
          <div className="leyenda-seccion">
            <h5 className="leyenda-titulo">Calidad de Señal</h5>
            <div className="leyenda-group">
              {LEYENDA.map((item, idx) => (
                <div key={idx} className="leyenda-item">
                  <div className="leyenda-color" style={{ background: item.color }}></div>
                  <span className="leyenda-texto">{item.lbl}</span>
                </div>
              ))}
              <div className="leyenda-item">
                <div className="leyenda-color" style={{ background: '#555' }}></div>
                <span className="leyenda-texto">Dispositivo NO Gestionable</span>
              </div>
            </div>
          </div>
          <div className="leyenda-seccion side-border">
            <h5 className="leyenda-titulo">Tipo de Conexión</h5>
            <div className="leyenda-group">
              <div className="leyenda-item">
                <div className="leyenda-linea line-fo"></div>
                <span className="leyenda-texto">Cableado / FO</span>
              </div>
              <div className="leyenda-item">
                <div className="leyenda-linea line-5g"></div>
                <span className="leyenda-texto">Wireless 5G</span>
              </div>
              <div className="leyenda-item">
                <div className="leyenda-linea line-24g"></div>
                <span className="leyenda-texto">Wireless 2.4G</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AREA DE DIBUJO TOPOLOGICÓ */}
      <div className="tree-wrapper">
        <div className="tree-root">
          {ontNode && (
            <>
              <div className="node-wrapper">
                <div className="node-card ont-node">
                  <div className="node-icon">
                    <Router size={24} />
                  </div>
                  <div className="node-info">
                    <strong>{ontNode.nombre}</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--win-orange)', fontWeight: 'bold' }}>
                        Marca: {ontNode.marca}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', opacity: 0.8 }}>
                        <Hash size={12} /> S/N: {ontNode.serialNumber}
                      </div>
                    </div>
                    <span className="node-meta">Raíz de Conexión</span>
                    <div className="node-location-badge">
                      P{ontNode.piso} - {ontNode.ambienteFinal}
                    </div>
                  </div>

                  {/* Botonera Edición de Raíz */}
                  <div className={`node-actions ${isExporting ? 'exporting-hide' : ''}`}>
                    <button className="node-action-btn btn-edit" onClick={() => startEditing(ontNode)} title="Editar equipo">
                      <Edit2 size={16} />
                    </button>
                  </div>

                </div>
              </div>
              {renderArbol('ONT')}
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default TopologiaRed;
