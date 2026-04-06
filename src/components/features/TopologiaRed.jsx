import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, Router, Wifi } from 'lucide-react';
import { UBICACIONES, LEYENDA, getRssiStyle } from '../../utils/constants';
import './Topologia.css';

const TopologiaRed = ({ equipos, setEquipos, isExporting }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddOnt, setShowAddOnt] = useState(false);

  const [newAp, setNewAp] = useState({
    parentId: 'ONT',
    conexion: 'Cableado', // Cableado | Inalámbrico
    banda: '5G', // 2.4G | 5G
    rssiBackhaul: '',
    piso: '',
    ambiente: 'Sala',
    ambientePersonalizado: ''
  });

  const [newOnt, setNewOnt] = useState({
    piso: '1',
    ambiente: 'Sala',
    ambientePersonalizado: ''
  });

  const ontNode = equipos.find(e => e.tipo === 'ONT');
  const apCount = equipos.filter(e => e.tipo === 'AP').length;

  const handleAddOnt = () => {
    // Validar que no existan campos vacíos críticos
    if (!newOnt.piso) return alert('Por favor ingresa el Piso de la ONT.');
    if (newOnt.ambiente === 'Otro' && !newOnt.ambientePersonalizado) return alert('Por favor ingresa el nombre manual del ambiente.');

    setEquipos([{
      id: 'ONT',
      nombre: 'ONT',
      tipo: 'ONT',
      piso: newOnt.piso,
      ambienteFinal: newOnt.ambiente === 'Otro' ? newOnt.ambientePersonalizado : newOnt.ambiente
    }]);
    setShowAddOnt(false);
  };

  const handleAddAp = () => {
    if (apCount >= 8) return;
    
    // Validar espacios en blanco
    if (!newAp.piso) return alert("Debes rellenar el Piso del Access Point.");
    if (newAp.ambiente === 'Otro' && !newAp.ambientePersonalizado) return alert("Por favor escribe el nombre del ambiente.");
    const isWireless = newAp.conexion === 'Inalámbrico';
    if (isWireless && !newAp.rssiBackhaul) return alert("Si configuras enlace Inalámbrico MESH, requieres escribir la señal RSSI del Backhaul.");

    const newId = `AP${apCount + 1}`;
    setEquipos([...equipos, {
      id: newId,
      nombre: `Access Point ${apCount + 1}`,
      tipo: 'AP',
      ...newAp, 
      ambienteFinal: newAp.ambiente === 'Otro' ? newAp.ambientePersonalizado : newAp.ambiente,
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
                
                {/* Línea de conexión con badge renderizable para PDF */}
                <div className={`tree-line ${lineClass}`}>
                  {hijo.conexion === 'Inalámbrico' && (
                    <span className={`wireless-badge ${hijo.banda === '5G' ? 'wb-5g' : 'wb-24g'}`}>
                      {hijo.banda}
                    </span>
                  )}
                </div>
                
                {/* Tarjeta del Nodo */}
                <div className="node-card" style={{ borderColor: nodeBorderColor, background: nodeBgColor }}>
                  <div className="node-icon ap-icon" style={{ background: styleInfo ? styleInfo.color : '#444' }}>
                    <Wifi size={20} />
                  </div>
                  <div className="node-info">
                    <strong>{hijo.nombre}</strong>
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
        
        {/* Desactivar botón o esconderlo según flag PDF */}
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
              label="Piso" 
              type="number"
              placeholder="Ej. 1" 
              value={newOnt.piso}
              onChange={e => setNewOnt({...newOnt, piso: e.target.value})}
            />
            <Select 
              label="Ambiente" 
              value={newOnt.ambiente}
              onChange={e => setNewOnt({...newOnt, ambiente: e.target.value})}
              options={UBICACIONES.map(u => ({ label: u, value: u }))}
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
              label="Piso" 
              type="number"
              placeholder="Ej. 2" 
              value={newAp.piso}
              onChange={e => setNewAp({...newAp, piso: e.target.value})}
            />
            <Select 
              label="Ambiente" 
              value={newAp.ambiente}
              onChange={e => setNewAp({...newAp, ambiente: e.target.value})}
              options={UBICACIONES.map(u => ({ label: u, value: u }))}
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
                  label="RSSI (dBm)" 
                  type="number"
                  placeholder="Ej: -55" 
                  value={newAp.rssiBackhaul}
                  onChange={e => setNewAp({...newAp, rssiBackhaul: e.target.value})}
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
