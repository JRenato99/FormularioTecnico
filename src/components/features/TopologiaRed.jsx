import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, Router, Wifi, Hash } from 'lucide-react';
import { LEYENDA, getRssiStyle } from '../../utils/constants';
import './Topologia.css';

/**
 * Módulo Arquitectónico: Topología de Red
 * 
 * Gestiona y despliega un árbol recursivo del mapa físico de conexión.
 * Las mecánicas críticas de este archivo incluyen el filtro anti-negativos 
 * para el RSSI y validaciones booleanas impidiendo submit vacíos.
 * 
 * @param {Object} props
 * @param {Array} props.equipos - Diccionario padre conteniendo todos los AP/ONT 
 * @param {boolean} props.isExporting - Bandera UI que esconde los botones al imprimir Canvas
 * @param {Array} props.listaUbicaciones - Listado mutable central de sitios
 */
const TopologiaRed = ({ equipos, setEquipos, isExporting, listaUbicaciones, onAgregarUbicacion }) => {

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddOnt, setShowAddOnt] = useState(false);

  /** @type {[Object, function]} Borrador volátil para las cajas al añadir un Access Point (Mesh/Cable) */
  const [newAp, setNewAp] = useState({
    serialNumber: '',
    parentId: 'ONT',
    conexion: 'Cableado', // Cableado | Inalámbrico
    banda: '5G', // 2.4G | 5G
    rssiBackhaul: '',
    piso: '',
    ambiente: 'Sala',
    ambientePersonalizado: ''
  });

  /** @type {[Object, function]} Borrador volátil para el setup de Matriz */
  const [newOnt, setNewOnt] = useState({
    serialNumber: '',
    piso: '1',
    ambiente: 'Sala',
    ambientePersonalizado: ''
  });

  const ontNode = equipos.find(e => e.tipo === 'ONT');
  const apCount = equipos.filter(e => e.tipo === 'AP').length;

  const handlePisoChange = (val, isOnt) => {
    let pStr = val.replace(/\D/g, ''); 
    if (!pStr) {
      if (isOnt) setNewOnt({...newOnt, piso: ''});
      else setNewAp({...newAp, piso: ''});
      return;
    }
    let p = parseInt(pStr, 10);
    if (p < 1) p = 1;
    if (p > 5) p = 5;
    
    if (isOnt) setNewOnt({...newOnt, piso: p.toString()});
    else setNewAp({...newAp, piso: p.toString()});
  };

  const handleRssiChange = (val) => {
    let vStr = val.replace(/-/g, ''); 
    if (!vStr) return setNewAp({...newAp, rssiBackhaul: ''});
    let v = parseInt(vStr, 10);
    if (isNaN(v)) return;
    setNewAp({...newAp, rssiBackhaul: `-${Math.abs(v)}`}); 
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
      ambienteFinal: ambienteF
    }]);
    setShowAddOnt(false);
  };

  const handleAddAp = () => {
    if (apCount >= 8) return;
    
    if (!newAp.serialNumber) return alert("Debes ingresar el S/N del AP.");
    if (!newAp.piso) return alert("Debes rellenar el Piso del Access Point.");
    if (newAp.ambiente === 'Otro' && !newAp.ambientePersonalizado) return alert("Por favor escribe el nombre del ambiente.");
    
    const isWireless = newAp.conexion === 'Inalámbrico';
    if (isWireless && !newAp.rssiBackhaul) return alert("Si configuras enlace Inalámbrico MESH, requieres escribir la señal RSSI del Backhaul.");

    const ambienteF = newAp.ambiente === 'Otro' ? newAp.ambientePersonalizado : newAp.ambiente;
    if (newAp.ambiente === 'Otro') onAgregarUbicacion(newAp.ambientePersonalizado);

    const newId = `AP${apCount + 1}`;
    setEquipos([...equipos, {
      id: newId,
      serialNumber: newAp.serialNumber,
      nombre: `Access Point ${apCount + 1}`,
      tipo: 'AP',
      ...newAp, 
      ambienteFinal: ambienteF,
      banda: isWireless ? newAp.banda : null,
      rssiBackhaul: isWireless ? newAp.rssiBackhaul : null
    }]);
    
    setShowAddModal(false);
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
          const styleInfo = hijo.conexion === 'Inalámbrico' ? getRssiStyle(hijo.rssiBackhaul) : null;
          const nodeBorderColor = styleInfo ? styleInfo.color : 'var(--border-color)';
          const nodeBgColor = styleInfo ? styleInfo.bg : 'var(--input-bg)';
          
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
                  <div className="node-icon ap-icon" style={{ background: styleInfo ? styleInfo.color : '#444' }}>
                    <Wifi size={20} />
                  </div>
                  <div className="node-info">
                    <strong>{hijo.nombre}</strong>
                    <div style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                      <Hash size={12}/> S/N: {hijo.serialNumber}
                    </div>
                    <span className="node-meta">{hijo.conexion} {hijo.conexion === 'Inalámbrico' ? `(${hijo.banda})` : ''}</span>
                    <div className="node-location-badge">
                      P{hijo.piso} - {hijo.ambienteFinal}
                    </div>
                    {hijo.conexion === 'Inalámbrico' && hijo.rssiBackhaul && (
                      <span style={{ fontSize: '0.85rem', color: styleInfo.color, fontWeight: '600' }}>
                        RSSI: {hijo.rssiBackhaul} dBm
                      </span>
                    )}
                  </div>
                  <button className={`del-btn ${isExporting ? 'exporting-hide' : ''}`} onClick={() => handleRemoveAp(hijo.id)} title="Eliminar equipo">
                    <Trash2 size={16} />
                  </button>
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
      <div className="topologia-header">
        <div>
          <h2>Topología de Red</h2>
          <p className="subtitle">Configura y visualiza la distribución de equipos y enlaces (Backhaul)</p>
        </div>
        
        <Button 
          onClick={() => setShowAddModal(!showAddModal)} 
          disabled={!ontNode || apCount >= 8}
          className={`${isExporting ? 'exporting-hide' : ''}`}
        >
          <Plus size={18} /> Añadir AP ({apCount}/8)
        </Button>
      </div>

      {!ontNode && !isExporting && (
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
              onChange={e => handlePisoChange(e.target.value, true)}
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

      {showAddModal && ontNode && !isExporting && (
        <div className="add-ap-form glass-panel animate-fade-in">
          <h4>Configurar Nuevo Access Point</h4>
          <div className="form-grid">
            <Input 
              label="Número de Serie (S/N) (*)" 
              placeholder="Ej: ZTTEB0123456" 
              value={newAp.serialNumber}
              onChange={e => setNewAp({...newAp, serialNumber: e.target.value.toUpperCase()})}
            />
             <Input 
              label="Piso (*)" 
              type="number"
              placeholder="1 a 5" 
              value={newAp.piso}
              onChange={e => handlePisoChange(e.target.value, false)}
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
                <Input 
                  label="RSSI (dBm) (*)" 
                  type="number"
                  placeholder="Ej: 55 se vuelve -55" 
                  value={newAp.rssiBackhaul}
                  onChange={e => handleRssiChange(e.target.value)}
                />
               </>
            )}
          </div>
          <Button style={{ marginTop: '1rem', width: '100%' }} onClick={handleAddAp}>
            Guardar y Añadir Equipo
          </Button>
        </div>
      )}

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
