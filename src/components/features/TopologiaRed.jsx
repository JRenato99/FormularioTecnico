import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, Router, Wifi, Activity } from 'lucide-react';
import './Topologia.css';

const LEYENDA = [
  { color: '#006400', lbl: 'Óptima (≥ -50dBm)', bg: 'rgba(0, 100, 0, 0.1)' },
  { color: '#32CD32', lbl: 'Buena (-51 a -60dBm)', bg: 'rgba(50, 205, 50, 0.1)' },
  { color: '#FFD700', lbl: 'Baja (-61 a -77dBm)', bg: 'rgba(255, 215, 0, 0.1)' },
  { color: '#FF8C00', lbl: 'Débil (-78 a -84dBm)', bg: 'rgba(255, 140, 0, 0.1)' },
  { color: '#FF0000', lbl: 'Fuera de Cobertura (< -84)', bg: 'rgba(255, 0, 0, 0.1)' }
];

const getRssiStyle = (rssiStr) => {
  if (!rssiStr || isNaN(rssiStr)) return null;
  const rssi = parseFloat(rssiStr);
  if (rssi >= -50) return LEYENDA[0];
  if (rssi >= -60) return LEYENDA[1];
  if (rssi >= -77) return LEYENDA[2];
  if (rssi >= -84) return LEYENDA[3];
  return LEYENDA[4];
};

const TopologiaRed = ({ equipos, setEquipos }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAp, setNewAp] = useState({
    parentId: 'ONT',
    conexion: 'Cableado', // Cableado | Inalámbrico
    banda: '5G', // 2.4G | 5G
    rssiBackhaul: ''
  });

  const apCount = equipos.filter(e => e.tipo === 'AP').length;

  const handleAddAp = () => {
    if (apCount >= 8) return;
    
    // Si la conexion es cableada, borramos el RSSI y la banda
    const isWireless = newAp.conexion === 'Inalámbrico';
    
    const newId = `AP${apCount + 1}`;
    setEquipos([...equipos, {
      id: newId,
      nombre: `Access Point ${apCount + 1}`,
      tipo: 'AP',
      ...newAp,
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
          
          return (
            <div key={hijo.id} className="tree-node-container animate-fade-in">
              <div className="node-wrapper">
                <div className={`tree-line ${hijo.conexion === 'Cableado' ? 'line-cable' : hijo.banda === '5G' ? 'line-wireless-5g' : 'line-wireless-24g'}`}>
                </div>
                
                <div className="node-card" style={{ borderColor: nodeBorderColor, background: nodeBgColor }}>
                  <div className="node-icon ap-icon" style={{ background: styleInfo ? styleInfo.color : '#444' }}>
                    <Wifi size={20} />
                  </div>
                  <div className="node-info">
                    <strong>{hijo.nombre}</strong>
                    <span className="node-meta">{hijo.conexion} {hijo.conexion === 'Inalámbrico' ? `(${hijo.banda})` : ''}</span>
                    {hijo.conexion === 'Inalámbrico' && hijo.rssiBackhaul && (
                      <span style={{ fontSize: '0.85rem', color: styleInfo.color, fontWeight: '600' }}>
                        RSSI: {hijo.rssiBackhaul} dBm
                      </span>
                    )}
                  </div>
                  <button className="del-btn" onClick={() => handleRemoveAp(hijo.id)}>
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

  const ontNode = equipos.find(e => e.tipo === 'ONT');

  return (
    <Card className="topologia-card">
      <div className="topologia-header">
        <div>
          <h2>Topología de Red</h2>
          <p className="subtitle">Configura y visualiza la calidad de los enlaces (Backhaul)</p>
        </div>
        <Button onClick={() => setShowAddModal(!showAddModal)} disabled={apCount >= 8}>
          <Plus size={18} /> Añadir AP ({apCount}/8)
        </Button>
      </div>

      {showAddModal && (
        <div className="add-ap-form glass-panel animate-fade-in">
          <h4>Configurar Nuevo Access Point</h4>
          <div className="form-grid">
            <Select 
              label="Conectar desde" 
              value={newAp.parentId}
              onChange={e => setNewAp({...newAp, parentId: e.target.value})}
              options={equipos.map(e => ({ label: e.nombre, value: e.id }))}
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
            Guardar Equipo
          </Button>
        </div>
      )}

      {/* Leyenda Visual */}
      <div className="leyenda-container">
        {LEYENDA.map((item, idx) => (
          <div key={idx} className="leyenda-item">
            <div className="leyenda-color" style={{ background: item.color }}></div>
            <span className="leyenda-texto">{item.lbl}</span>
          </div>
        ))}
        <div className="leyenda-item" style={{marginLeft: 'auto'}}>
           <div className="leyenda-linea" style={{background: 'var(--win-orange)'}}></div>
           <span className="leyenda-texto">Cableado</span>
        </div>
        <div className="leyenda-item">
           <div className="leyenda-linea" style={{background: 'repeating-linear-gradient(to right, #A855F7, #A855F7 4px, transparent 4px, transparent 8px)'}}></div>
           <span className="leyenda-texto">Wireless 5G</span>
        </div>
        <div className="leyenda-item">
           <div className="leyenda-linea" style={{background: 'repeating-linear-gradient(to right, #2ECA7F, #2ECA7F 4px, transparent 4px, transparent 8px)'}}></div>
           <span className="leyenda-texto">Wireless 2.4G</span>
        </div>
      </div>

      <div className="tree-wrapper">
        <div className="tree-root">
          <div className="node-wrapper">
            <div className="node-card ont-node">
              <div className="node-icon">
                <Router size={24} />
              </div>
              <div className="node-info">
                <strong>{ontNode?.nombre || 'ONT Principal'}</strong>
                <span className="node-meta">Raíz de Conexión</span>
              </div>
            </div>
          </div>
          {renderArbol('ONT')}
        </div>
      </div>
    </Card>
  );
};

export default TopologiaRed;
