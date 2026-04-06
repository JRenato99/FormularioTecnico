import React, { useState } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Plus, Trash2, Home, Activity } from 'lucide-react';
import { UBICACIONES, getRssiStyle } from '../../utils/constants';
import './FormularioMediciones.css';

const FormularioMediciones = ({ equipos, mediciones, setMediciones }) => {

  // Crear una nueva medición vacía en la lista
  const addMedicion = () => {
    setMediciones([...mediciones, {
      id: Date.now(),
      ubicacion: 'Sala',
      ubicacionPersonalizada: '',
      piso: '1',
      equipoId: equipos.length > 0 ? equipos[0].id : '',
      lineaVista: 'Si',
      velocidad24g: '',
      velocidad5g: '',
      rssi24g: '',
      rssi5g: ''
    }]);
  };

  const updateMedicion = (id, field, value) => {
    setMediciones(mediciones.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeMedicion = (id) => {
    setMediciones(mediciones.filter(m => m.id !== id));
  };

  // Componente interno para mostrar la placa de RSSI
  const RssiBadge = ({ rssiValue }) => {
    const styleInfo = getRssiStyle(rssiValue);
    if (!styleInfo) return null;
    return (
      <div 
        className="rssi-evaluation-badge" 
        style={{ borderColor: styleInfo.color, background: styleInfo.bg, color: styleInfo.color }}
      >
        {styleInfo.lbl}
      </div>
    );
  };

  return (
    <Card>
      <div className="form-mediciones-header">
        <div>
          <h2>Mediciones por Ambiente</h2>
          <p className="form-mediciones-subtitle">Registra los niveles de señal y velocidad en cada zona de la casa.</p>
        </div>
        <Button onClick={addMedicion}>
          <Plus size={18} /> Agregar Ambiente
        </Button>
      </div>

      {mediciones.length === 0 ? (
        <div className="empty-state-box">
          <Home size={48} color="var(--text-muted)" className="empty-state-icon" />
          <p className="empty-state-text">Aún no has registrado ninguna medición en el domicilio.</p>
        </div>
      ) : (
        <div className="mediciones-list">
          {mediciones.map((med, index) => (
            <div key={med.id} className="glass-panel animate-fade-in medicion-card">
              
              <div className="medicion-del-btn-container">
                <button onClick={() => removeMedicion(med.id)} className="medicion-del-btn" title="Eliminar medición">
                  <Trash2 size={20} />
                </button>
              </div>

              <h4 className="medicion-card-title">
                <span className="medicion-index-badge">
                  {index + 1}
                </span>
                Detalle del Ambiente
              </h4>
              
              <div className="medicion-fields-grid">
                <Select 
                  label="Ubicación" 
                  value={med.ubicacion}
                  onChange={e => updateMedicion(med.id, 'ubicacion', e.target.value)}
                  options={UBICACIONES.map(u => ({ label: u, value: u }))}
                />
                
                {med.ubicacion === 'Otro' && (
                  <Input 
                    label="Nombre del Ambiente" 
                    placeholder="Ej. Sótano"
                    value={med.ubicacionPersonalizada}
                    onChange={e => updateMedicion(med.id, 'ubicacionPersonalizada', e.target.value)}
                  />
                )}

                <Input 
                  label="Piso" 
                  type="number"
                  placeholder="Ej. 1"
                  value={med.piso}
                  onChange={e => updateMedicion(med.id, 'piso', e.target.value)}
                />

                <Select 
                  label="Equipo Emisor (AP/ONT)" 
                  value={med.equipoId}
                  onChange={e => updateMedicion(med.id, 'equipoId', e.target.value)}
                  options={equipos.map(e => ({ label: e.nombre, value: e.id }))}
                />
                
                <Select 
                  label="Línea de Vista (LOS)" 
                  value={med.lineaVista}
                  onChange={e => updateMedicion(med.id, 'lineaVista', e.target.value)}
                  options={[
                    { label: 'Sí (Directa)', value: 'Si' },
                    { label: 'No (Con Obstáculos)', value: 'No' },
                  ]}
                />
              </div>

              {/* Sub-secciones de datos numéricos */}
              <div className="medicion-bottom-sections">
                
                {/* Sección de Velocidades */}
                <div className="medicion-bottom-col border-right">
                  <p className="medicion-section-title">
                    <Activity size={16} /> Pruebas de Velocidad (Mbps)
                  </p>
                  <div className="medicion-data-grid">
                    <Input 
                      label="Velocidad 2.4 GHz" 
                      type="number"
                      placeholder="Ej. 60"
                      value={med.velocidad24g}
                      onChange={e => updateMedicion(med.id, 'velocidad24g', e.target.value)}
                    />
                    <Input 
                      label="Velocidad 5 GHz" 
                      type="number"
                      placeholder="Ej. 300"
                      value={med.velocidad5g}
                      onChange={e => updateMedicion(med.id, 'velocidad5g', e.target.value)}
                    />
                  </div>
                </div>

                {/* Sección de Señales con evaluación */}
                <div className="medicion-bottom-col">
                  <p className="medicion-section-title">
                    <Activity size={16} /> Mediciones Sensoriales RSSI (dBm)
                  </p>
                  <div className="medicion-data-grid">
                    <div className="rssi-input-group">
                      <Input 
                        label="Señal 2.4 GHz" 
                        type="number"
                        placeholder="Ej. -45"
                        value={med.rssi24g}
                        onChange={e => updateMedicion(med.id, 'rssi24g', e.target.value)}
                      />
                      <RssiBadge rssiValue={med.rssi24g} />
                    </div>
                    
                    <div className="rssi-input-group">
                      <Input 
                        label="Señal 5 GHz" 
                        type="number"
                        placeholder="Ej. -50"
                        value={med.rssi5g}
                        onChange={e => updateMedicion(med.id, 'rssi5g', e.target.value)}
                      />
                      <RssiBadge rssiValue={med.rssi5g} />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default FormularioMediciones;
