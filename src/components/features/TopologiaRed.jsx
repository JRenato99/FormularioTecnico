import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, Router, Wifi, Hash, Edit2, ShieldAlert } from 'lucide-react';
import { LEYENDA, getRssiStyle } from '../../utils/constants';
import './Topologia.css';

/**
 * Módulo Arquitectónico: Topología de Red
 */
const TopologiaRed = ({ equipos, setEquipos, isExporting, listaUbicaciones, onAgregarUbicacion }) => {

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddOnt, setShowAddOnt] = useState(false);
  const [editingNode, setEditingNode] = useState(null);

  // Bandera para diferenciar AP tipo WIN de tipo Tercero (3th)
  const [isAdding3thParty, setIsAdding3thParty] = useState(false);

  // Estructura Vacía de un AP para resetear después de añadir
  const initialApState = {
    serialNumber: '',
    parentId: 'ONT',
    conexion: 'Cableado', 
    banda: '5G', 
    rssiBackhaul: '',
    piso: '',
    ambiente: 'Sala',
    ambientePersonalizado: ''
  };

  const [newAp, setNewAp] = useState(initialApState);

  const [newOnt, setNewOnt] = useState({
    serialNumber: '',
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
    
    if (mode === 'ont') setNewOnt({...newOnt, piso: p});
    else if (mode === 'ap') setNewAp({...newAp, piso: p});
    else if (mode === 'edit') setEditingNode({...editingNode, piso: p});
  };

  const handleRssiChange = (val, isEdit = false) => {
    let vStr = val.replace(/-/g, ''); 
    let finalVal = '';
    if (vStr && !isNaN(parseInt(vStr, 10))) {
      finalVal = `-${Math.abs(parseInt(vStr, 10))}`;
    }
    if (isEdit) setEditingNode({...editingNode, rssiBackhaul: finalVal});
    else setNewAp({...newAp, rssiBackhaul: finalVal});
  };

  const handleAddOnt = () => {
    if (!newOnt.serialNumber) return alert('Por favor ingresa el Número de Serie (S/N) de la ONT.');
    if (!newOnt.piso) return alert('Por favor ingresa el Piso de la ONT.');
    if (newOnt.ambiente === 'Otro' && !newOnt.ambientePersonalizado) return alert('Por favor ingresa el nombre manual del ambiente.');

    const ambienteF = newOnt.ambiente === 'Otro' ? newOnt.ambientePersonalizado : newOnt.ambiente;
    if (newOnt.ambiente === 'Otro') onAgregarUbicacion(newOnt.ambientePersonalizado);

    setEquipos([{
      id: 'ONT',
      serialNumber: newOnt.serialNumber,
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
    setNewAp(initialApState); // Vaciado estricto para evitar copiar del registro anterior
    setEditingNode(null);
    setShowAddModal(true);
  };

  const handleAddAp = () => {
    if (apCount >= 8) return;
    
    if (!isAdding3thParty && !newAp.serialNumber) return alert("Debes ingresar el S/N del AP WIN.");
    if (!newAp.piso) return alert("Debes rellenar el Piso del Access Point.");
    if (newAp.ambiente === 'Otro' && !newAp.ambientePersonalizado) return alert("Por favor escribe el nombre del ambiente.");
    
    const isWireless = newAp.conexion === 'Inalámbrico';
    
    // Solo exigir RSSI si NO es un equipo de Terceros (Gestionable)
    if (isWireless && !isAdding3thParty && !newAp.rssiBackhaul) {
      return alert("Si configuras enlace Inalámbrico MESH, requieres escribir la señal RSSI del Backhaul.");
    }

    const ambienteF = newAp.ambiente === 'Otro' ? newAp.ambientePersonalizado : newAp.ambiente;
    if (newAp.ambiente === 'Otro') onAgregarUbicacion(newAp.ambientePersonalizado);

    const newId = `AP${Date.now()}`;
    const nameStr = isAdding3thParty ? `AP 3th Party` : `AP WIN`;
    
    setEquipos([...equipos, {
      id: newId,
      nombre: nameStr,
      tipo: 'AP',
      ...newAp, 
      serialNumber: isAdding3thParty ? 'NO-ASIGNADO' : newAp.serialNumber,
      ambienteFinal: ambienteF,
      banda: isWireless ? newAp.banda : null,
      rssiBackhaul: (isWireless && !isAdding3thParty) ? newAp.rssiBackhaul : null,
      esTercero: isAdding3thParty
    }]);
    
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
    if (!editingNode.esTercero && !editingNode.serialNumber) return alert("Debes ingresar el S/N.");
    if (!editingNode.piso) return alert("Debes rellenar el Piso.");
    if (editingNode.ambiente === 'Otro' && !editingNode.ambientePersonalizado) return alert("Escribe el nombre del ambiente especial.");
    
    const isWireless = editingNode.conexion === 'Inalámbrico';
    if (editingNode.tipo === 'AP' && isWireless && !editingNode.esTercero && !editingNode.rssiBackhaul) {
      return alert("Requieres escribir la señal RSSI del Backhaul.");
    }

    const ambienteF = editingNode.ambiente === 'Otro' ? editingNode.ambientePersonalizado : editingNode.ambiente;
    if (editingNode.ambiente === 'Otro') onAgregarUbicacion(editingNode.ambientePersonalizado);

    const checkCircular = editingNode.id === editingNode.parentId;
    if (checkCircular) return alert("Un equipo no puede conectarse a si mismo.");

    setEquipos(equipos.map(e => {
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
    }));
    
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
          
          return (
            <div key={hijo.id} className="tree-node-container animate-fade-in">
              <div className="node-wrapper">
                <div className={`tree-line ${lineClass}`}>
                  {hijo.conexion === 'Inalámbrico' && (
                    <span className={`wireless-badge ${hijo.banda === '5G' ? 'wb-5g' : 'wb-24g'}`}>
                      {hijo.banda}
                    </span>
                  )}
                </div>
                
                <div className="node-card" style={{ borderColor: nodeBorderColor, background: nodeBgColor }}>
                  <div className="node-icon ap-icon" style={{ background: iconBgColor }}>
                    {is3th ? <ShieldAlert size={20} /> : <Wifi size={20} />}
                  </div>
                  <div className="node-info">
                    <strong>{hijo.nombre}</strong>
                    
                    {!is3th && (
                      <div style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                        <Hash size={12}/> S/N: {hijo.serialNumber}
                      </div>
                    )}
                    
                    <span className="node-meta">{hijo.conexion} {hijo.conexion === 'Inalámbrico' ? `(${hijo.banda})` : ''}</span>
                    <div className="node-location-badge">
                      P{hijo.piso} - {hijo.ambienteFinal}
                    </div>
                    {hijo.conexion === 'Inalámbrico' && hijo.rssiBackhaul && !is3th && (
                      <span style={{ fontSize: '0.85rem', color: styleInfo.color, fontWeight: '600' }}>
                        RSSI: {hijo.rssiBackhaul} dBm
                      </span>
                    )}
                  </div>
                  
                  {/* Botonera de Control de Nodo */}
                  <div className={`node-actions ${isExporting ? 'exporting-hide' : ''}`} style={{display: 'flex', gap: '8px', position: 'absolute', right: '12px', top: '12px'}}>
                    <button className="del-btn" style={{color: 'var(--text-secondary)'}} onClick={() => startEditing(hijo)} title="Editar equipo">
                      <Edit2 size={16} />
                    </button>
                    <button className="del-btn" onClick={() => handleRemoveAp(hijo.id)} title="Eliminar equipo">
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
             <Edit2 size={18}/> Editar Registro: {editingNode.nombre}
          </h4>
          <div className="form-grid">
            
            {!editingNode.esTercero && (
              <Input 
                label="Número de Serie (S/N) (*)" 
                placeholder="Ej: ALCLB0123456" 
                value={editingNode.serialNumber}
                onChange={e => setEditingNode({...editingNode, serialNumber: e.target.value.toUpperCase()})}
              />
            )}
            
             <Input 
              label="Piso (*)" 
              type="number"
              placeholder="1 a 5" 
              value={editingNode.piso}
              onChange={e => handlePisoChange(e.target.value, 'edit')}
            />
            <Select 
              label="Ambiente (*)" 
              value={editingNode.ambiente || 'Sala'}
              onChange={e => setEditingNode({...editingNode, ambiente: e.target.value})}
              options={listaUbicaciones.map(u => ({ label: u, value: u }))}
            />
            {editingNode.ambiente === 'Otro' && (
              <Input 
                label="Nombre del Ambiente" 
                placeholder="Ej. Sótano"
                value={editingNode.ambientePersonalizado}
                onChange={e => setEditingNode({...editingNode, ambientePersonalizado: e.target.value})}
              />
            )}

            {editingNode.tipo === 'AP' && (
              <>
                <Select 
                  label="Conectar desde" 
                  value={editingNode.parentId}
                  onChange={e => setEditingNode({...editingNode, parentId: e.target.value})}
                  options={equipos.filter(e => e.id !== editingNode.id).map(e => ({ label: `${e.nombre} (P${e.piso} - ${e.ambienteFinal})`, value: e.id }))}
                />
                <Select 
                  label="Tipo de Conexión" 
                  value={editingNode.conexion}
                  onChange={e => setEditingNode({...editingNode, conexion: e.target.value})}
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
                      onChange={e => setEditingNode({...editingNode, banda: e.target.value})}
                      options={[
                        { label: '5 GHz', value: '5G' },
                        { label: '2.4 GHz', value: '2.4G' }
                      ]}
                    />
                    
                    {!editingNode.esTercero && (
                      <Input 
                        label="RSSI (dBm) (*)" 
                        type="number"
                        placeholder="Ej: 55 se vuelve -55" 
                        value={editingNode.rssiBackhaul}
                        onChange={e => handleRssiChange(e.target.value, true)}
                      />
                    )}
                   </>
                )}
              </>
            )}

          </div>
          <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
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
            <Input 
              label="Número de Serie (S/N) (*)" 
              placeholder="Ej: ALCLB0123456" 
              value={newOnt.serialNumber}
              onChange={e => setNewOnt({...newOnt, serialNumber: e.target.value.toUpperCase()})}
            />
             <Input 
              label="Piso (*)" 
              type="number"
              placeholder="1 a 5" 
              value={newOnt.piso}
              onChange={e => handlePisoChange(e.target.value, 'ont')}
            />
            <Select 
              label="Ambiente (*)" 
              value={newOnt.ambiente}
              onChange={e => setNewOnt({...newOnt, ambiente: e.target.value})}
              options={listaUbicaciones.map(u => ({ label: u, value: u }))}
            />
            {newOnt.ambiente === 'Otro' && (
              <Input 
                label="Nombre del Ambiente" 
                placeholder="Ej. Sótano"
                value={newOnt.ambientePersonalizado}
                onChange={e => setNewOnt({...newOnt, ambientePersonalizado: e.target.value})}
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
        <div className="add-ap-form glass-panel animate-fade-in" style={{ borderColor: isAdding3thParty ? '#666' : 'var(--border-color)' }}>
          <h4>{isAdding3thParty ? 'Configurar AP 3th Party (Sin Gestión)' : 'Configurar Nuevo Access Point WIN'}</h4>
          <div className="form-grid">
            
            {/* Solo pedir SN si no es tercero */}
            {!isAdding3thParty && (
              <Input 
                label="Número de Serie (S/N) (*)" 
                placeholder="Ej: ZTTEB0123456" 
                value={newAp.serialNumber}
                onChange={e => setNewAp({...newAp, serialNumber: e.target.value.toUpperCase()})}
              />
            )}

             <Input 
              label="Piso (*)" 
              type="number"
              placeholder="1 a 5" 
              value={newAp.piso}
              onChange={e => handlePisoChange(e.target.value, 'ap')}
            />
            <Select 
              label="Ambiente (*)" 
              value={newAp.ambiente}
              onChange={e => setNewAp({...newAp, ambiente: e.target.value})}
              options={listaUbicaciones.map(u => ({ label: u, value: u }))}
            />
            {newAp.ambiente === 'Otro' && (
              <Input 
                label="Nombre del Ambiente" 
                placeholder="Ej. Pasillo 2do piso"
                value={newAp.ambientePersonalizado}
                onChange={e => setNewAp({...newAp, ambientePersonalizado: e.target.value})}
              />
            )}

            <Select 
              label="Conectar desde" 
              value={newAp.parentId}
              onChange={e => setNewAp({...newAp, parentId: e.target.value})}
              options={equipos.map(e => ({ label: `${e.nombre} (P${e.piso} - ${e.ambienteFinal})`, value: e.id }))}
            />
            <Select 
              label="Tipo de Conexión" 
              value={newAp.conexion}
              onChange={e => setNewAp({...newAp, conexion: e.target.value})}
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
                  onChange={e => setNewAp({...newAp, banda: e.target.value})}
                  options={[
                    { label: '5 GHz', value: '5G' },
                    { label: '2.4 GHz', value: '2.4G' }
                  ]}
                />
                
                {/* RSSI solo si no es tercero */}
                {!isAdding3thParty && (
                  <Input 
                    label="RSSI (dBm) (*)" 
                    type="number"
                    placeholder="Ej: 55 se vuelve -55" 
                    value={newAp.rssiBackhaul}
                    onChange={e => handleRssiChange(e.target.value, false)}
                  />
                )}
               </>
            )}
          </div>
          <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
             <Button style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} onClick={() => setShowAddModal(false)}>
               Cancelar
             </Button>
             <Button style={{ flex: 1, background: isAdding3thParty ? '#444' : 'var(--win-blue-light)', color: 'white', borderColor: isAdding3thParty ? '#444' : 'var(--win-blue-light)' }} onClick={handleAddAp}>
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
                    <div style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', opacity: 0.8}}>
                      <Hash size={12}/> S/N: {ontNode.serialNumber}
                    </div>
                    <span className="node-meta">Raíz de Conexión</span>
                    <div className="node-location-badge">
                      P{ontNode.piso} - {ontNode.ambienteFinal}
                    </div>
                  </div>
                  
                  {/* Botonera Edición de Raíz */}
                  <div className={`node-actions ${isExporting ? 'exporting-hide' : ''}`} style={{display: 'flex', gap: '8px', position: 'absolute', right: '12px', top: '12px'}}>
                    <button className="del-btn" style={{color: 'var(--text-secondary)'}} onClick={() => startEditing(ontNode)} title="Editar equipo">
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
